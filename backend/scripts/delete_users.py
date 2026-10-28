import argparse
import asyncio
import sys
from uuid import UUID

from sqlalchemy import delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import User


async def list_users(db: AsyncSession) -> None:
    users = (await db.scalars(select(User).order_by(User.employee_code))).all()
    print("\n" + "=" * 90)
    print(f"{'EMP CODE':<12} | {'NAME':<20} | {'ROLE':<25} | {'EMAIL':<25} | ACTIVE")
    print("=" * 90)
    for u in users:
        active_str = "YES" if u.is_active else "NO"
        print(f"{u.employee_code:<12} | {u.display_name:<20} | {(u.role_title or ''):<25} | {u.email:<25} | {active_str}")
    print("=" * 90)
    print(f"Total Users: {len(users)}\n")


async def delete_all_users(db: AsyncSession, keep_master_tables: bool = True) -> None:
    schema = settings.database_schema or "tracker"
    print(f"\nDeleting all users in schema '{schema}'...")

    # Using TRUNCATE ... CASCADE in PostgreSQL cleanly clears users and dependent CR/task tables
    async with db.begin():
        await db.execute(text(f'TRUNCATE TABLE "{schema}".users CASCADE;'))

    print(f"All users in schema '{schema}' and their dependent records have been deleted successfully.")


async def delete_user_by_identifier(
    db: AsyncSession,
    email: str | None = None,
    employee_code: str | None = None,
    user_id: str | None = None,
    soft: bool = False,
    reassign_to_email: str | None = None,
) -> None:
    schema = settings.database_schema or "tracker"
    query = select(User)
    if email:
        query = query.where(User.email == email)
    elif employee_code:
        query = query.where(User.employee_code == employee_code)
    elif user_id:
        query = query.where(User.id == UUID(user_id))
    else:
        print("Error: Please provide an email, employee-code, or user-id.")
        return

    user = await db.scalar(query)
    if not user:
        print(f"No user found matching identifier: email={email}, code={employee_code}, id={user_id}")
        return

    print(f"Found user: {user.display_name} ({user.employee_code}, {user.email})")

    if soft:
        user.is_active = False
        await db.commit()
        print(f"User {user.email} has been deactivated (soft-deleted: is_active=False).")
        return

    # If hard delete:
    try:
        # Attempt direct deletion
        await db.delete(user)
        await db.commit()
        print(f"User {user.email} deleted successfully.")
    except Exception as exc:
        await db.rollback()
        print(f"\nDirect deletion failed due to foreign key constraints (this user is referenced by active CRs or tasks):")
        print(f"  {exc}\n")

        if reassign_to_email:
            target_user = await db.scalar(select(User).where(User.email == reassign_to_email))
            if not target_user:
                print(f"Target reassign user '{reassign_to_email}' not found.")
                return

            print(f"Reassigning references from {user.email} to {target_user.email}...")
            # Reassign foreign keys
            await db.execute(
                text(f'UPDATE "{schema}".change_requests SET ba_user_id = :new_id WHERE ba_user_id = :old_id'),
                {"new_id": target_user.id, "old_id": user.id},
            )
            await db.execute(
                text(f'UPDATE "{schema}".change_requests SET primary_pm_id = :new_id WHERE primary_pm_id = :old_id'),
                {"new_id": target_user.id, "old_id": user.id},
            )
            await db.execute(
                text(f'UPDATE "{schema}".dev_tasks SET assigned_developer_id = :new_id WHERE assigned_developer_id = :old_id'),
                {"new_id": target_user.id, "old_id": user.id},
            )
            await db.execute(
                text(f'UPDATE "{schema}".dev_tasks SET reviewer_id = :new_id WHERE reviewer_id = :old_id'),
                {"new_id": target_user.id, "old_id": user.id},
            )
            await db.execute(
                text(f'UPDATE "{schema}".defects SET assigned_developer_id = :new_id WHERE assigned_developer_id = :old_id'),
                {"new_id": target_user.id, "old_id": user.id},
            )
            await db.execute(
                text(f'UPDATE "{schema}".defects SET reporter_user_id = :new_id WHERE reporter_user_id = :old_id'),
                {"new_id": target_user.id, "old_id": user.id},
            )
            await db.execute(
                text(f'UPDATE "{schema}".impact_assessments SET assessed_by_user_id = :new_id WHERE assessed_by_user_id = :old_id'),
                {"new_id": target_user.id, "old_id": user.id},
            )
            await db.delete(user)
            await db.commit()
            print(f"References reassigned and user {user.email} deleted successfully.")
        else:
            print("Tip: Use '--soft' to deactivate the user, or '--reassign-to <email>' to transfer their CRs/tasks first.")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Script to manage and delete users in UAT Tracker")
    parser.add_argument("--list", action="store_true", help="List all users")
    parser.add_argument("--all", action="store_true", help="Delete all users (resets user base and dependent data)")
    parser.add_argument("--email", type=str, help="Delete user by email")
    parser.add_argument("--employee-code", type=str, help="Delete user by employee code")
    parser.add_argument("--id", type=str, help="Delete user by UUID")
    parser.add_argument("--soft", action="store_true", help="Soft-delete (deactivate: is_active=False)")
    parser.add_argument("--reassign-to", type=str, help="Reassign CRs and tasks to this user before deleting")

    args = parser.parse_args()

    async with SessionLocal() as db:
        if args.list:
            await list_users(db)
        elif args.all:
            confirm = input("Are you sure you want to delete ALL users and dependent CR/task data? (yes/no): ")
            if confirm.strip().lower() in ("yes", "y"):
                await delete_all_users(db)
            else:
                print("Aborted.")
        elif args.email or args.employee_code or args.id:
            await delete_user_by_identifier(
                db=db,
                email=args.email,
                employee_code=args.employee_code,
                user_id=args.id,
                soft=args.soft,
                reassign_to_email=args.reassign_to,
            )
        else:
            await list_users(db)
            print("\nUsage examples:")
            print("  List users:                      python backend/scripts/delete_users.py --list")
            print("  Soft-delete (deactivate):        python backend/scripts/delete_users.py --email alice.ba@company.com --soft")
            print("  Delete all users (clean reset):  python backend/scripts/delete_users.py --all")
            print("  Delete user by code:             python backend/scripts/delete_users.py --employee-code EMP-001\n")


if __name__ == "__main__":
    asyncio.run(main())
