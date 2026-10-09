import json
import shlex

from sqlalchemy.orm import Session

from ...core.errors import AppError
from ..auth.models import User
from .commands import ROUTE53
from .parser import CliUsageError, parse_args

HELP = """\
Route 53 CloudShell. Supported commands:

  aws sts get-caller-identity
  aws route53 list-hosted-zones
  aws route53 list-hosted-zones-by-name [--dns-name NAME]
  aws route53 get-hosted-zone --id ZONE_ID
  aws route53 create-hosted-zone --name NAME --caller-reference REF
        [--hosted-zone-config Comment=TEXT,PrivateZone=true|false] [--vpc VPCRegion=R,VPCId=ID]
  aws route53 update-hosted-zone-comment --id ZONE_ID --comment TEXT
  aws route53 delete-hosted-zone --id ZONE_ID
  aws route53 list-resource-record-sets --hosted-zone-id ZONE_ID
  aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID --change-batch JSON
  aws route53 test-dns-answer --hosted-zone-id ZONE_ID --record-name NAME --record-type TYPE
  aws route53 list-health-checks
  aws route53 get-health-check --health-check-id ID
  aws route53 get-health-check-status --health-check-id ID
  aws route53 create-health-check --caller-reference REF --health-check-config
        Type=HTTP|HTTPS|TCP,FullyQualifiedDomainName=HOST|IPAddress=IP,Port=N,ResourcePath=/,
        RequestInterval=30,FailureThreshold=3
  aws route53 delete-health-check --health-check-id ID

Example change batch:
  aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch \\
    '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"www.example.com","Type":"A","TTL":300,
      "ResourceRecords":[{"Value":"192.0.2.1"}]}}]}'

Other commands: help, clear, whoami
"""

USAGE = "usage: aws [options] <command> <subcommand> [<subcommand> ...] [parameters]\nTo see help text, you can run:\n\n  help\n"


def run(db: Session, user: User, command: str) -> tuple[str, int]:
    try:
        tokens = shlex.split(command.replace("\\\n", " "))
    except ValueError as exc:
        return f"bash: syntax error: {exc}", 2
    if not tokens:
        return "", 0
    if tokens[0] in ("help", "--help") or (tokens[0] == "aws" and tokens[-1] == "help"):
        return HELP, 0
    if tokens[0] == "whoami":
        return user.username, 0
    if tokens[0] != "aws":
        return f"bash: {tokens[0]}: command not found. Try 'help'.", 127
    if len(tokens) < 3:
        return USAGE + "\naws: error: the following arguments are required: command, operation", 252

    service, operation, rest = tokens[1], tokens[2], tokens[3:]
    if service == "sts" and operation == "get-caller-identity":
        return json.dumps({"UserId": f"AIDA{user.id:016d}", "Account": user.account_id,
                           "Arn": f"arn:aws:iam::{user.account_id}:user/{user.username}"}, indent=4), 0
    if service != "route53":
        return USAGE + f"\naws: error: service '{service}' isn't available in this CloudShell. Try 'aws route53'.", 252
    if operation not in ROUTE53:
        return (USAGE + "\naws: error: argument operation: Invalid choice, valid choices are:\n\n"
                + "\n".join(f"  {k}" for k in sorted(ROUTE53))), 252

    api_name, handler = ROUTE53[operation]
    try:
        result = handler(db, user, parse_args(rest))
    except CliUsageError as exc:
        return f"usage: aws route53 {operation} [parameters]\naws: error: {exc}", 252
    except AppError as exc:
        db.rollback()
        return f"An error occurred ({exc.code}) when calling the {api_name} operation: {exc.message}", 254
    except (ValueError, TypeError) as exc:
        db.rollback()
        return f"An error occurred (InvalidInput) when calling the {api_name} operation: {exc}", 254
    return (json.dumps(result, indent=4) if result else ""), 0
