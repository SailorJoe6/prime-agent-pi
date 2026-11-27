import { type Component, getKeybindings, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import stripAnsi from "strip-ansi";
import type {
	FactoryRunAction,
	FactoryRunActionResult,
	FactoryRunGraph,
	FactoryRunsRead,
} from "../../../core/kernel/shared.js";
import { keyText } from "./keybinding-hints.js";

interface FactoryPageOptions {
	read(): Promise<FactoryRunsRead>;
	act(runId: string, action: FactoryRunAction): Promise<FactoryRunActionResult>;
	isCurrentSession(): boolean;
	getRows(): number;
	requestRender(): void;
	onClose(): void;
}

const clean = (text: string) =>
	Array.from(stripAnsi(text), (c) => {
		const code = c.charCodeAt(0);
		return code < 32 || (code >= 127 && code <= 159) ? " " : c;
	}).join("");
const label = (action: FactoryRunAction) => (action === "stop" ? "Stop" : "Resume");
const eligible = (run: FactoryRunGraph, action: FactoryRunAction) => action === "stop" || run.state === "paused";
const statusText = {
	absent: "No Python kernel in this session.",
	unsupported: "This session’s runtime does not support factory controls.",
	unavailable: "Factory runs are unavailable. The page will retry the read.",
};

export class FactoryPage implements Component {
	private read: FactoryRunsRead | undefined;
	private selectedId: string | undefined;
	private menu: { runId: string; action: FactoryRunAction } | undefined;
	private pendingRead: Promise<void> | undefined;
	private busy = false;
	private closed = false;
	private notice: string | undefined;
	private timer: ReturnType<typeof setInterval> | undefined;
	private diagramOffset = 0;
	private diagramPageSize = 1;

	constructor(private readonly options: FactoryPageOptions) {}

	start(): void {
		this.timer = setInterval(() => {
			if (!this.busy) void this.refresh();
		}, 1000);
		void this.refresh();
	}

	dispose(): void {
		this.closed = true;
		clearInterval(this.timer);
	}

	private isCurrent(): boolean {
		if (this.closed) return false;
		if (this.options.isCurrentSession()) return true;
		this.options.onClose();
		return false;
	}

	private get runs(): FactoryRunGraph[] {
		return this.read?.status === "ok" ? this.read.runs : [];
	}

	private get selected(): FactoryRunGraph | undefined {
		return this.runs.find((run) => run.run_id === this.selectedId);
	}

	private async refresh(): Promise<void> {
		if (!this.isCurrent()) return;
		if (this.pendingRead) return this.pendingRead;
		this.pendingRead = this.readRuns();
		try {
			await this.pendingRead;
		} finally {
			this.pendingRead = undefined;
		}
	}

	private async readRuns(): Promise<void> {
		try {
			const read = await this.options.read();
			if (!this.isCurrent()) return;
			this.read = read;
		} catch {
			if (!this.isCurrent()) return;
			this.read = { status: "unavailable" };
		}
		if (this.menu && (!this.selected || !eligible(this.selected, this.menu.action))) {
			this.notice = `${label(this.menu.action)} is no longer available for that run.`;
			this.menu = undefined;
		}
		// Keep the identity across temporary read failures, not across a confirmed disappearance.
		if (this.read.status === "ok" && !this.selected) {
			this.selectedId = this.runs[0]?.run_id;
			this.diagramOffset = 0;
		}
		this.options.requestRender();
	}

	private async dispatch(menu: NonNullable<FactoryPage["menu"]>): Promise<void> {
		this.busy = true;
		try {
			// A read started before the user's confirmation isn't a dispatch check.
			await this.pendingRead;
			await this.refresh();
			if (!this.isCurrent() || this.menu !== menu || this.selected?.run_id !== menu.runId) return;
			if (!eligible(this.selected, menu.action)) return;
			this.menu = undefined;
			this.notice = `${label(menu.action)} requested…`;
			this.options.requestRender();
			const result = await this.options.act(menu.runId, menu.action);
			if (!this.isCurrent()) return;
			this.notice =
				result.status === "ok"
					? `${label(menu.action)} completed.`
					: result.status === "error"
						? `${label(menu.action)} rejected: ${clean(result.error)}`
						: `Could not confirm ${label(menu.action).toLowerCase()}: ${statusText[result.status]}`;
			await this.refresh();
		} catch {
			this.notice = `Could not confirm ${label(menu.action).toLowerCase()}.`;
		} finally {
			this.busy = false;
			if (this.isCurrent()) this.options.requestRender();
		}
	}

	handleInput(data: string): void {
		if (!this.isCurrent()) return;
		const keys = getKeybindings();
		if (keys.matches(data, "tui.select.cancel")) {
			if (this.menu) this.menu = undefined;
			else this.options.onClose();
		} else if (!this.busy) {
			const move = keys.matches(data, "tui.select.up") ? -1 : keys.matches(data, "tui.select.down") ? 1 : 0;
			if (move !== 0) {
				this.notice = undefined;
				if (this.menu && this.selected?.state === "paused") {
					this.menu = { ...this.menu, action: this.menu.action === "stop" ? "resume" : "stop" };
				} else if (!this.menu && this.runs.length > 0) {
					const i = this.runs.findIndex((run) => run.run_id === this.selectedId);
					this.selectedId = this.runs[(i + move + this.runs.length) % this.runs.length]?.run_id;
					this.diagramOffset = 0;
				}
			} else if (keys.matches(data, "tui.select.confirm")) {
				if (this.menu) void this.dispatch(this.menu);
				else if (this.selected) {
					this.notice = undefined;
					this.menu = {
						runId: this.selected.run_id,
						action: this.selected.state === "paused" ? "resume" : "stop",
					};
				}
			} else if (keys.matches(data, "tui.select.pageUp")) {
				this.diagramOffset = Math.max(0, this.diagramOffset - this.diagramPageSize);
			} else if (keys.matches(data, "tui.select.pageDown")) {
				this.diagramOffset += this.diagramPageSize;
			}
		}
		if (!this.closed) this.options.requestRender();
	}

	invalidate(): void {}

	render(width: number): string[] {
		const run = this.selected;
		const lines = ["Factory runs"];
		const actions =
			this.menu && run
				? `${run.state === "paused" ? `${this.menu.action === "resume" ? ">" : " "} Resume    ` : ""}${this.menu.action === "stop" ? ">" : " "} Stop`
				: undefined;
		const hint = `${keyText("tui.select.up")}/${keyText("tui.select.down")} move · ${keyText("tui.select.confirm")} ${this.menu ? "choose" : "actions"} · ${keyText("tui.select.cancel")} ${this.menu ? "back" : "close"}`;
		if (run) {
			const index = this.runs.indexOf(run);
			lines.push(`${index + 1}/${this.runs.length}  ${clean(run.name)} [${clean(run.state)}]`);
			const active = new Set(run.active_nodes);
			const diagram = [
				"Diagram (* active)",
				...run.machine.order.map((node) => `${active.has(node) ? "*" : " "} ${clean(node)}`),
				...run.machine.transitions.map(
					({ from, to }) => `${(Array.isArray(from) ? from : [from]).map(clean).join(" + ")} → ${clean(to)}`,
				),
			].flatMap((line) => wrapTextWithAnsi(line, Math.max(width, 1)));
			this.diagramPageSize = Math.max(1, this.options.getRows() - lines.length - 4);
			this.diagramOffset = Math.min(this.diagramOffset, Math.max(0, diagram.length - this.diagramPageSize));
			lines.push(...diagram.slice(this.diagramOffset, this.diagramOffset + this.diagramPageSize));
			if (diagram.length > this.diagramPageSize) {
				lines.push(`${keyText("tui.select.pageUp")}/${keyText("tui.select.pageDown")} diagram`);
			}
		} else {
			lines.push(
				!this.read
					? "Reading factory runs…"
					: this.read.status === "ok"
						? "No live factory runs."
						: statusText[this.read.status],
			);
		}
		if (actions) lines.push(actions);
		if (this.notice) lines.push(this.notice);
		lines.push(hint);
		return lines.map((line) => truncateToWidth(line, width));
	}
}
