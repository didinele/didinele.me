---
title: "A journey through code optimization (and highschool math)"
date: 2023-02-06T19:28:24+02:00
draft: false 
toc: false
math: true
images:
tags:
  - math
  - algorithms
  - programming
  - optimization
---

## Introduction

At the time of writing this, I'm a highschool student. With the way our school system is laid out, I end up doing
*a lot* of math - more so than computer science - and lately I've been very passionate about it.

Anyways, our story begins on the 5th of February, 2023. I was working on a Discord bot for [ChatSift], responsible for
some sort of leveling system - users would gain XP for sending messages, and crossing certain thresholds would cause you
to level up. As I was working out my database schema, I landed on this:

```prisma
model User {
  userId  String
  guildId String
  xp      Int    @default(0)

  @@id([userId, guildId])
}
```

and thought to myself, "hmm, I could potentially get away with not storing the current level, and just calculate it on
the fly."

The main reason I even thought of this was because the formula to determine the XP required for a given level is
$base + (level - 1) * multiplier$. For example, if the base was `100`, and the multiplier was `50`, then the XP required
for level 1 would be `100`, and the XP required for level 2 would be `150`, and so on. This is a very simple formula, and
it would be trivial to track if the user had enough XP to level up, and if so, increment their level and subtract the XP
on the fly, but I thought it would be a headache to have to recompute the level for *every* user in the whole community if
an admin decided to change the `base` or the `multiplier`.

# Optimization problems

As such, I opted to not store the level, and instead just store the *total* XP the user has *ever* accumulated, and
compute the level on the fly as-needed. At this point, I realized that calculating how much XP is needed for say, level 3,
is the sum of the XP required for levels 1, 2, and the usual $base + (level - 1) * multiplier$.

I then decided to represent this mathematically before implementing it, and I ended up with this:

$$
n, m \in \mathbb{N*} \newline
f: \mathbb{N*} \rightarrow \mathbb{N*} \newline
f(x) = \begin{cases}
    n & x = 1 \newline
    f(x - 1) + xm & x > 1
  \end{cases}
$$

where `n` is our base, `m` is our multiplier and `x` is the level.

I then wrote this up in my TypeScript codebase:

```ts
export function calculateRequiredXp(settings: GuildSettings, level: number): number {
    const { requiredXpBase, requiredXpMultiplier } = settings;
    if (level === 1) {
        return requiredXpBase;
    }

    return calculateRequiredXp(settings, level - 1) + requiredXpMultiplier * level;
}
```

It quickly became apparent to me that this was not going to perform all that well. Calculating what level a user is
looked like this:

```ts
export function calculateUserLevel(settings: GuildSettings, user: User): number {
	for (let level = 1; ; level++) {
		const requiredXp = calculateRequiredXp(settings, level);
		if (user.xp < requiredXp) {
			return level - 1;
		}
	}
}
```

If they were level `N`, we would actually be computing the XP required for level 1 `N` times. This is obviously not
ideal, and I decided to try and optimize it. I opted for memoization and ended up with this:

```ts
const requiredXpMemo = new Map<`${number}-${number}-${number}`, number>();

export function calculateRequiredXp(settings: GuildSettings, level: number): number {
    const { requiredXpBase, requiredXpMultiplier } = settings;

    const memoKey = `${requiredXpBase}-${requiredXpMultiplier}-${level}` as const;
    if (requiredXpMemo.has(memoKey)) {
        return requiredXpMemo.get(memoKey)!;
    }

    const result = calculateRequiredXp(settings, level - 1) + requiredXpMultiplier * level;
    requiredXpMemo.set(memoKey, result);

    return result;
}
```

# Math comes to the rescue - maybe

This was already a lot better in terms of speed, but we were going to store a lot of values in that map, and I was
confident that there was more room for improvement. I went back to my original `f` function and wrote it as a series:
$a_x = a_{(x - 1)} + (x - 1) * m$, where $a_1 = n$ and $x > 1$.

Calculating the first few terms of this series, we get:

$$
a_1 = n \newline
a_2 = n + m \newline
a_3 = n + 3m \newline
a_4 = n + 6m \newline
a_5 = n + 10m
$$

At this point, my brain flashed me back throughout this fall when I did recurring series in math class. Unfortunately,
other than a few specific cases, class had only really taught us how to "guess" a closed-form formula, and prove it
using mathematical induction. Looking back, I'm a bit disappointed in myself for not trying that out more, but I digress.

I noticed that in my series, only the coefficient of the `m` term was changing, and only depending on `x`. As such,
I now knew that I could isolate the logic for calculating the coefficient of the `m` term into its own function,
and only that would need to be recursive. Since that function would not rely on the values of `n` and `m`, the
memoization was going to be a lot more powerful. I ended up with this:

```ts
const multiplifierCoefficientMemo = new Map<number, number>();

function calculateMultiplifierCoefficient(level: number): number {
    if (multiplifierCoefficientMemo.has(level)) {
        return multiplifierCoefficientMemo.get(level)!;
    }

    if (level === 1) {
        return 0;
    }

    const result = calculateMultiplifierCoefficient(level - 1) + level;
    multiplifierCoefficientMemo.set(level, result);

    return result;
}

export function calculateRequiredXp(settings: GuildSettings, level: number): number {
    const { requiredXpBase, requiredXpMultiplier } = settings;
    if (level === 1) {
        return requiredXpBase;
    }

    return requiredXpBase + level * requiredXpMultiplier * calculateMultiplifierCoefficient(level);
}
```

# OEIS to the rescue

Across the 2 days I worked on this, I was chatting with some friends about it, and around this point one of them
suggested that I should plug my series into [oeis], which I didn't even know existed.

So, looking at our current `calculateRequiredXp`, we have:

$$
n, m \in \mathbb{N*} \newline
f, g: \mathbb{N*} \rightarrow \mathbb{N} \newline
g(x) = \begin{cases}
    0 & x = 1 \newline
    g(x - 1) + x & x > 1
  \end{cases} \\newline
f(x) = n + x * m * g(x)
$$

`g` written out as a recurring series is $a_x = a_{(x - 1)} + x - 1$, where $a_1 = 0$ and $x > 1$.

Our first few terms are: `0, 1, 3, 6, 10, 15`. I plugged this into [oeis], and wouldn't ya know it,
this is the [A000217 sequence][A000217], which **does** have a closed-form formula: $x * (2 * x - 1)$

Plugging this back into our original function, we have:

$$
n, m \in \mathbb{N*} \newline
f: \mathbb{N*} \rightarrow \mathbb{N*} \newline
f(x) = n + x * m * (2 * x - 1)
$$

and in TypeScript land:

```ts
export function calculateRequiredXp(settings: GuildSettings, level: number): number {
	const { requiredXpBase, requiredXpMultiplier } = settings;
	return requiredXpBase + level * requiredXpMultiplier * (2 * level - 1);
}
```

# Conclusion

Even though I couldn't figure out the closed-form formula myself, I'm still pretty happy about my thought process
throughout this seemingly simple task. I'm particularly entusiasthic about the fact that I was able to use my math
knowledge to solve a real-world problem, and I'm looking forward to using it even more in the future.

It's also particularly gratifying to see that my code is a lot more efficient now.

[ChatSift]: https://github.com/ChatSift
[oeis]: https://oeis.org/
[A000217]: https://oeis.org/A000217
