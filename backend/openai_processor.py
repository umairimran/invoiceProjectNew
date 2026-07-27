import json
import os
import re
from copy import deepcopy
from typing import Any, Dict

from dotenv import load_dotenv
from openai import OpenAI


load_dotenv()


DEFAULT_OPENAI_MODEL = "gpt-5.6-luna"


def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to backend/.env.")
    return OpenAI(api_key=api_key)


def _schema_name(schema: Dict[str, Any]) -> str:
    raw_name = schema.get("title") or schema.get("name") or "invoice_extraction"
    clean_name = re.sub(r"[^a-zA-Z0-9_-]", "_", str(raw_name)).strip("_")
    return clean_name[:64] or "invoice_extraction"


def _openai_json_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    normalized_schema = deepcopy(schema)
    normalized_schema.pop("name", None)
    normalized_schema.pop("title", None)

    return {
        "type": "json_schema",
        "name": _schema_name(schema),
        "schema": normalized_schema,
        "strict": False,
    }


def _extract_response_json(response: Any) -> Dict[str, Any]:
    parsed = getattr(response, "output_parsed", None)
    if isinstance(parsed, dict):
        return parsed

    output_text = getattr(response, "output_text", None)
    if output_text:
        return json.loads(output_text)

    for item in getattr(response, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            text = getattr(content, "text", None)
            if text:
                return json.loads(text)

    raise ValueError("OpenAI response did not contain JSON output.")


def openai_api_function(prompt: str, schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Drop-in replacement for the previous Gemini JSON extraction call.
    Keeps the same prompt and schema pipeline, but uses OpenAI Structured Outputs.
    """
    client = _get_client()
    model = os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)

    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "system",
                "content": (
                    "You are a precise financial document extraction engine. "
                    "Return only JSON that follows the provided schema. "
                    "If a value is not present, omit it unless the schema requires it."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        text={"format": _openai_json_schema(schema)},
    )

    return _extract_response_json(response)
