const Transfers = (() => {
  async function fetchUsed(md) {
    try {
      const hist = await Api.getTransfers(md);
      return hist.length;
    } catch (e) { return 0; }
  }

  function enter() {
    if (State.transfersRemaining() <= 0) {
      Toast.show(t("toast.no_transfers_left"), "info");
      return;
    }
    if (window.innerWidth <= 760) setTeamPane("pitch");
    State.setMode("transfer");
    var transferTourKey = "gaffer_transfer_tour_done_" + (window._userId || "anon");
    if (!localStorage.getItem(transferTourKey) && window.Tour) {
      Tour.start(Tour.TRANSFER_STEPS);
    }
  }

  // transfer → view: throw away the pending edits, restore the saved squad.
  function cancel() {
    State.restoreBaseline();
    if (window.innerWidth <= 760) setTeamPane("summary");
    State.setMode("view");
  }

  async function confirm() {
    const pending = State.pendingTransfers();
    if (!pending.length) return;

    const remaining = State.transfersRemaining();
    if (pending.length > remaining) {
      Toast.show(t("toast.only_n_transfers", remaining), "error");
      return;
    }

    const btn = document.getElementById("confirmBtn");
    if (btn) btn.disabled = true;

    Progress.start();

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
        failures.push(`${swap.out.name} → ${swap.in.name}: ${e.message || t("toast.rejected")}`);
      }
    }

    // Backend is authoritative — re-sync (resets baseline + drops back to view mode).
    await loadSquadForMatchday(State.currentMatchday);
    if (window.innerWidth <= 760) setTeamPane("summary");

    Progress.done();

    if (failures.length && done) {
      Toast.show(t("toast.transfers_confirmed_mixed", done, failures.length, failures[0]), "info");
    } else if (failures.length) {
      Toast.show(t("toast.transfer_rejected", failures[0]), "error");
    } else {
      Toast.show(t("toast.transfers_confirmed", done), "success");
    }
  }

  return { enter, cancel, confirm, fetchUsed };
})();
