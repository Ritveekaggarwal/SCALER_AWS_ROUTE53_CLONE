import json


class CliUsageError(Exception):
    pass


def parse_args(tokens: list[str]) -> dict[str, str]:
    args: dict[str, str] = {}
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if not tok.startswith("--"):
            raise CliUsageError(f"Unknown options: {tok}")
        key = tok[2:]
        if "=" in key:
            key, value = key.split("=", 1)
        elif i + 1 < len(tokens) and not tokens[i + 1].startswith("--"):
            value = tokens[i + 1]
            i += 1
        else:
            value = "true"
        args[key] = value
        i += 1
    args.pop("output", None)
    args.pop("region", None)
    return args


def need(args: dict[str, str], *keys: str) -> list[str]:
    missing = [k for k in keys if not args.get(k)]
    if missing:
        raise CliUsageError("the following arguments are required: " + ", ".join(f"--{k}" for k in missing))
    return [args[k] for k in keys]


def shorthand(text: str) -> dict:
    text = text.strip()
    if text.startswith("{"):
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise CliUsageError(f"Error parsing parameter: Invalid JSON: {exc}") from None
    out = {}
    for part in filter(None, text.split(",")):
        if "=" not in part:
            raise CliUsageError(f"Error parsing parameter: expected Key=Value, got '{part}'")
        k, v = part.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def to_bool(v) -> bool:
    return v is True or str(v).lower() == "true"
