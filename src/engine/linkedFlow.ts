import {
  add,
  compare,
  div,
  isPositive,
  isZero,
  mul,
  neg,
  rational,
  sub,
  sum,
  type Rational,
} from './rational';

export interface LinkedFlowGroup {
  readonly id: string;
  readonly total: Rational;
  readonly votes: Readonly<Record<string, Rational>>;
  readonly allowedPartyIds: readonly string[];
}

export type LinkedFlowResult =
  | {
      readonly ok: true;
      readonly votes: Readonly<
        Record<string, Readonly<Record<string, Rational>>>
      >;
    }
  | {
      readonly ok: false;
      readonly reason: 'forbidden-transfer' | 'search-limit';
    };

const ZERO = rational(0n);
const MAX_ARC_VISITS = 1_000_000;
const MAX_AUGMENTATIONS = 10_000;

function byId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

interface Edge {
  readonly to: number;
  readonly reverse: number;
  readonly initial: Rational;
  capacity: Rational;
}

/** Exact intra-group transfers, with deterministic residual rerouting if needed. */
export function transferLinkedVotes(
  inputGroups: readonly LinkedFlowGroup[],
  changes: Readonly<Record<string, Rational>>,
): LinkedFlowResult {
  const groups = [...inputGroups].sort((a, b) => byId(a.id, b.id));
  const donors = Object.keys(changes)
    .filter((id) => compare(changes[id]!, ZERO) < 0)
    .sort(byId);
  const recipients = Object.keys(changes)
    .filter((id) => isPositive(changes[id]!))
    .sort(byId);
  const votes = new Map(
    groups.map((group) => [group.id, new Map(Object.entries(group.votes))]),
  );
  const result = (): LinkedFlowResult => ({
    ok: true,
    votes: Object.fromEntries(
      groups.map((group) => [
        group.id,
        Object.fromEntries(votes.get(group.id)!),
      ]),
    ),
  });
  if (donors.length === 0 && recipients.length === 0) return result();
  const gains = sum(recipients.map((id) => changes[id]!));
  const losses = sum(donors.map((id) => neg(changes[id]!)));
  if (isZero(gains) || compare(gains, losses) !== 0) {
    throw new Error('Linked transfer gains must equal losses');
  }

  const unrestricted = groups.every(
    (group) =>
      !donors.some((id) => isPositive(group.votes[id] ?? ZERO)) ||
      recipients.every((id) => group.allowedPartyIds.includes(id)),
  );
  if (unrestricted) {
    for (const donor of donors) {
      const available = sum(groups.map((group) => group.votes[donor] ?? ZERO));
      if (isZero(available)) return { ok: false, reason: 'forbidden-transfer' };
      for (const group of groups) {
        const row = votes.get(group.id)!;
        const taken = mul(
          neg(changes[donor]!),
          div(group.votes[donor] ?? ZERO, available),
        );
        row.set(donor, sub(row.get(donor) ?? ZERO, taken));
        for (const recipient of recipients) {
          const received = mul(taken, div(changes[recipient]!, gains));
          row.set(recipient, add(row.get(recipient) ?? ZERO, received));
        }
      }
    }
    return result();
  }

  function search(proportional: boolean): LinkedFlowResult {
    const source = 0;
    const donorStart = 1;
    const groupStart = donorStart + donors.length;
    const recipientStart = groupStart + groups.length;
    const sink = recipientStart + recipients.length;
    const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);
    function edge(from: number, to: number, capacity: Rational): Edge {
      const forward: Edge = {
        to,
        reverse: graph[to]!.length,
        capacity,
        initial: capacity,
      };
      const reverse: Edge = {
        to: from,
        reverse: graph[from]!.length,
        capacity: ZERO,
        initial: ZERO,
      };
      graph[from]!.push(forward);
      graph[to]!.push(reverse);
      return forward;
    }
    const withdrawals: { group: string; party: string; edge: Edge }[] = [];
    const deposits: { group: string; party: string; edge: Edge }[] = [];
    donors.forEach((id, index) => {
      edge(source, donorStart + index, neg(changes[id]!));
      const available = sum(groups.map((group) => group.votes[id] ?? ZERO));
      if (isZero(available)) return;
      groups.forEach((group, groupIndex) => {
        const contribution = group.votes[id] ?? ZERO;
        const capacity = proportional
          ? mul(neg(changes[id]!), div(contribution, available))
          : contribution;
        withdrawals.push({
          group: group.id,
          party: id,
          edge: edge(donorStart + index, groupStart + groupIndex, capacity),
        });
      });
    });
    groups.forEach((group, groupIndex) => {
      recipients.forEach((id, index) => {
        if (group.allowedPartyIds.includes(id)) {
          deposits.push({
            group: group.id,
            party: id,
            edge: edge(
              groupStart + groupIndex,
              recipientStart + index,
              group.total,
            ),
          });
        }
      });
    });
    recipients.forEach((id, index) => {
      edge(recipientStart + index, sink, changes[id]!);
    });
    let flow = ZERO;
    let visits = 0;
    let augmentations = 0;
    while (compare(flow, gains) < 0) {
      if (augmentations >= MAX_AUGMENTATIONS) {
        return { ok: false, reason: 'search-limit' };
      }
      const previous: ({ node: number; edge: number } | null)[] = Array.from(
        { length: graph.length },
        () => null,
      );
      const seen = new Set([source]);
      const queue = [source];
      for (
        let cursor = 0;
        cursor < queue.length && !seen.has(sink);
        cursor += 1
      ) {
        const node = queue[cursor]!;
        for (const [index, candidate] of graph[node]!.entries()) {
          visits += 1;
          if (visits > MAX_ARC_VISITS)
            return { ok: false, reason: 'search-limit' };
          if (!isPositive(candidate.capacity) || seen.has(candidate.to))
            continue;
          seen.add(candidate.to);
          previous[candidate.to] = { node, edge: index };
          queue.push(candidate.to);
          if (candidate.to === sink) break;
        }
      }
      if (!seen.has(sink)) return { ok: false, reason: 'forbidden-transfer' };
      let amount = sub(gains, flow);
      for (let node = sink; node !== source;) {
        const step = previous[node]!;
        const candidate = graph[step.node]![step.edge]!;
        if (compare(candidate.capacity, amount) < 0)
          amount = candidate.capacity;
        node = step.node;
      }
      for (let node = sink; node !== source;) {
        const step = previous[node]!;
        const candidate = graph[step.node]![step.edge]!;
        candidate.capacity = sub(candidate.capacity, amount);
        const reverse = graph[candidate.to]![candidate.reverse]!;
        reverse.capacity = add(reverse.capacity, amount);
        node = step.node;
      }
      flow = add(flow, amount);
      augmentations += 1;
    }
    for (const item of withdrawals) {
      const row = votes.get(item.group)!;
      row.set(
        item.party,
        sub(
          row.get(item.party) ?? ZERO,
          sub(item.edge.initial, item.edge.capacity),
        ),
      );
    }
    for (const item of deposits) {
      const row = votes.get(item.group)!;
      row.set(
        item.party,
        add(
          row.get(item.party) ?? ZERO,
          sub(item.edge.initial, item.edge.capacity),
        ),
      );
    }
    return result();
  }
  const proportional = search(true);
  return proportional.ok || proportional.reason === 'search-limit'
    ? proportional
    : search(false);
}
