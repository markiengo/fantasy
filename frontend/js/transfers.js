/* ============================================================================
   transfers.js — On-pitch transfer engine (replaces the old modal).

   Transfers happen directly on the My Team pitch: enter transfer mode, remove
   players and re-add same-position replacements, then Confirm. Each pending
   swap (computed by State.pendingTransfers) is sent as one POST /transfer.
   The backend (GR-05..GR-07) re-validates the squad after each individual
   transfer, so swaps are sent budget-freeing-first to keep every intermediate
   squad within the cap. The backend is authoritative — after confirming we
   reload the saved squad rather than trusting local state.
   ============================================================================ */

const Transfers = (() => {
  async function fetchUsed(md) {
    try {
      const hist = await Api.getTransfers(md);
      return hist.length;
    } catch (e) { return 0; }
  }

  // view → transfer: refresh the remaining-transfers count, then flip mode.
  async function enter() {
    State.transfersUsed = await fetchUsed(State.currentMatchday);
    if (State.transfersRemaining() <= 0) {
      Toast.show("No transfers left this round.", "info");
      return;
    }
    State.setMode("transfer");
  }

  // transfer → view: throw away the pending edits, restore the saved squad.
  function cancel() {
    State.restoreBaseline();
    State.setMode("view");
  }

  async function confirm() {
    const pending = State.pendingTransfers();
    if (!pending.length) return;

    const remaining = State.transfersRemaining();
    if (pending.length > remaining) {
      Toast.show(`Only ${remaining} transfer${remaining === 1 ? "" : "s"} left this round.`, "error");
      return;
    }

    const btn = document.getElementById("makeTransfersBtn");
    btn.disabled = true;

    // Each change is one POST /transfer — the single documented entry point for
    // squad edits (API.md §5). It updates squadplayer + budget on the existing
    // squad; the backend enforces the 5/matchday cap (GR-05) and window (GR-07).
    let done = 0;
    const failures = [];
    for (const swap of pending) {
      try {
        await Api.createTransfer(swap.in.player_id, swap.out.player_id, State.currentMatchday);
        done++;
      } catch (e) {
        failures.push(`${swap.out.name} → ${swap.in.name}: ${e.message || "rejected"}`);
      }
    }

    // Backend is authoritative — re-sync (resets baseline + drops back to view mode).
    await loadSquadForMatchday(State.currentMatchday);

    if (failures.length && done) {
      Toast.show(`${done} transfer${done === 1 ? "" : "s"} confirmed; ${failures.length} rejected (${failures[0]}).`, "info");
    } else if (failures.length) {
      Toast.show(`Transfer rejected — ${failures[0]}`, "error");
    } else {
      Toast.show(`${done} transfer${done === 1 ? "" : "s"} confirmed.`, "success");
    }
  }

  return { enter, cancel, confirm, fetchUsed };
})();
