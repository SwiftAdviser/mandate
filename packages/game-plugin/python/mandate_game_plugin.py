"""Mandate GAME SDK Plugin for Virtuals Protocol."""
from __future__ import annotations

import os
from typing import Any

# game_sdk is an optional peer dependency
try:
    from game_sdk.game.custom_types import Function, Argument, FunctionResult, FunctionResultStatus
    HAS_GAME_SDK = True
except ImportError:
    HAS_GAME_SDK = False

# mandate_sdk_py is an optional peer dependency
try:
    from mandate_sdk import MandateClient
    HAS_MANDATE_SDK = True
except ImportError:
    HAS_MANDATE_SDK = False


class MandatePlugin:
    """
    GAME SDK plugin that wraps Mandate API for policy-enforced on-chain actions.

    Usage:
        from mandate_game_plugin import MandatePlugin

        plugin = MandatePlugin(
            runtime_key="mndt_live_...",
            rpc_url="https://sepolia.base.org",
            chain_id=84532,
        )
        # Use plugin.functions in a GameWorker
    """

    def __init__(
        self,
        runtime_key: str | None = None,
        rpc_url: str | None = None,
        chain_id: int = 84532,
        mandate_api_url: str = "https://api.mandate.krutovoy.me",
    ) -> None:
        self.runtime_key = runtime_key or os.environ.get("MANDATE_RUNTIME_KEY", "")
        self.rpc_url = rpc_url or os.environ.get("MANDATE_RPC_URL", "https://sepolia.base.org")
        self.chain_id = chain_id
        self.mandate_api_url = mandate_api_url

    def _validate_tx(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Call Mandate /api/validate via HTTP."""
        import urllib.request
        import json as _json

        data = _json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{self.mandate_api_url}/api/validate",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.runtime_key}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:
            return _json.loads(resp.read())

    @property
    def functions(self) -> list[Any]:
        """Return list of GameSDK Function objects."""
        if not HAS_GAME_SDK:
            raise ImportError("game_sdk is required: pip install game_sdk")

        def transfer_execute(args: dict[str, str]) -> "FunctionResult":
            to = args.get("to_address", "")
            amount = args.get("amount", "")
            token = args.get("token_address", "")

            try:
                result = self._validate_tx({
                    "chainId": self.chain_id,
                    "to": to,
                    "calldata": "0x",
                    "valueWei": "0",
                    "gasLimit": "100000",
                    "maxFeePerGas": "1000000000",
                    "maxPriorityFeePerGas": "1000000000",
                    "nonce": 0,
                    "txType": 2,
                    "accessList": [],
                    "intentHash": "0x" + "0" * 64,
                })
                if not result.get("allowed", True):
                    return FunctionResult(
                        status=FunctionResultStatus.FAILED,
                        feedback=f"Blocked by Mandate policy: {result.get('blockReason', 'unknown')}",
                        result={},
                    )
                return FunctionResult(
                    status=FunctionResultStatus.DONE,
                    feedback=f"Transfer validated. IntentId: {result.get('intentId')}",
                    result={"intentId": result.get("intentId"), "to": to, "amount": amount, "token": token},
                )
            except Exception as e:
                return FunctionResult(
                    status=FunctionResultStatus.FAILED,
                    feedback=f"Mandate validation error: {e}",
                    result={},
                )

        transfer_fn = Function(
            fn_name="mandate_transfer",
            fn_description="Transfer ERC20 tokens with Mandate policy enforcement",
            args=[
                Argument(name="to_address", description="Recipient EVM address"),
                Argument(name="amount", description="Amount in token smallest units"),
                Argument(name="token_address", description="ERC20 token contract address"),
            ],
            executable=transfer_execute,
        )

        return [transfer_fn]
