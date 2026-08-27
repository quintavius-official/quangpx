---
title: "About DevOps"
pubDatetime: 2026-08-26T00:00:00Z
description: "DevOps isn't just CI/CD or a job title, it's one boring feedback loop that never goes out of style. From the origin of the name to Agent Loops and AGI."
tags:
  - DevOps
  - CI/CD
  - Automation
  - AGI
  - Agentic AI
featured: true
draft: false
---

Today I want to talk about a term that isn't new at all, one every Dev and Architect already knows by heart, and one that even gets dismissed as boring in tech circles these days. And yet it might be the single hardest term to make outdated or replace: DevOps.

## All about the (boring) Loops

So what is DevOps? Like the title says, it's all about the (very boring) loops! At this point you're probably already thinking of today's hottest buzzwords: Agent Loops, Loops Engineering, insert-yet-another-made-up-loops-name-here, etc, the kind of thing that, once you bolt it onto your AI agent, turns it into either 1) a bona fide superintelligence, or 2) an extremely efficient token-burning machine...

Kidding aside, to really understand DevOps we have to rewind years back, to the Stone Age of software, when nobody had even heard of GenAI yet (honestly, I'm not sure I'd survive going back to those dark ages!).

Say a software engineer (or "Dev" for short, as we call it at my company) builds a product, a piece of software, or even just a small chunk of source code, and wants to ship it from their local machine to a test environment, then further out to staging, and eventually to prod.

Before you're allowed to deploy, you have to survive a mountain of complicated processes: checking for missing commas or stray spaces (kidding!), making sure naming conventions, code smells, design patterns, DRY, KISS, and whatever-home-grown-process-your-company-invented are all in order... then once deployed, you need full integration test coverage, security scans, and so on and so forth... before you finally reach Prod.

And even Prod isn't the finish line. For that feature to actually reach users, you need to check whether it touches data migration, whether it needs backfilling and backward-compatibility testing, and that's just for an internal product. What about an end-user-facing one?

Which users, which regions, which version, canary or straight rollout, measuring impact and performance post-deploy so the growth team can swoop in for data and funnel metrics.... all of it closes into a feedback loop, which turns into a plan, then a requirement, and the Dev is back at square one, and the software just keeps improving, loop after loop, over time.

Everything I just described is process, is workflow, and every software shop big or small has to go through some version of it, maybe with a gate added or removed here and there. But broadly speaking, as I like to jokingly call it, it's one very boring process loop, or if you want the fancier name for it: CI/CD.

When it first started, the need was really just deploying to an environment so users could use the thing. But over time, as more technology, more toolsets, and more things a dev could bolt onto their CI/CD pipeline showed up, the need for operations kept growing right along with it.

> And the name DevOps didn't just appear out of thin air: back in 2007, a guy named Patrick Debois got fed up with the friction between Dev and Ops during a data center migration project. At Agile 2008 he found a kindred spirit in Andrew Shafer, at a session that literally had 2 attendees (counting the two of them!). Then in 2009, after watching Flickr's legendary "10+ Deploys per Day" talk, he decided to throw an entire conference called DevOpsDays just to officially name the thing they'd both been nursing for years. And that's how the demand for "DevOps Engineers" started taking shape too.

And then, inevitably, a whole family of copycat terms was born to ride the wave: GitOps, SecOps, AIOps, DevSecOps, DevSecAIOps, DevSecAIAgentOps, some-absurdly-long-name-Ops, (I'm fully convinced someone out there is going to coin "LoopsOps" too, and yes it sounds a little naive, but I guarantee some young gun somewhere is already drafting the pitch deck...) ....

But in the end it all comes back to one thing: every one of those copycat terms is just water poured into the big container called DevOps. What you actually pour into that container just depends on your team, your company, and the business of the software you're building...

## From automation to autonomous and AGI

And plenty of people will notice this and ask themselves, "This workflow/CI-CD stuff sounds a lot more like automation, why isn't it just called automation instead of DevOps?"

Automation is correct, but not sufficient. Back to the container metaphor: automation is the quality of the liquid you pour inside.

Fine wine? Craft beer? Doesn't matter what it is, as long as it's good quality.

But not every liquid poured into a bottle earns the right to be called a bottle of wine, and the same goes for automation: not every automation gets to call itself DevOps. It has to close into a feedback loop, the one I described above.

And worth repeating: what the internet is currently calling "loops" or "loops engineering" is really just a premium single-malt whisky, aged for however many decades (or however long it took to get trained on the data), poured into a beautifully engraved bottle with some fancy script on the label: "Powered by &lt;insert trillion-dollar AI company here&gt;"...

![An ultra-luxury whiskey decanter engraved with “Powered by a trillion-dollar AI company,” representing premium packaging around automation.](./image_1.png)

Exactly right! But to keep riding this fancy trend, we obviously can't just call that high-quality output "automation" anymore, it has to be something grander: Autonomous, AGI, the Singularity, Superintelligence, Matrix, Skynet, etc... You get where I'm going with this, right?

But let's be serious for a second: if we actually reach that level, what would it even look like? Nobody knows, not even the people who "discovered" it.

Elon Musk, currently the richest person on the planet and no slouch in the smarts department either, recently told The Economist (7/2026) that by 2036 money will stop mattering, because AI and robots will create so much material abundance that nobody will need cash just to have food and shelter. Do you buy it?

![A wealthy silhouette and fading money beside robotic hands creating abundant essentials, illustrating a speculative post-scarcity future.](./image_2.png)

## The final target

I won't go further down the AGI rabbit hole since it's a bit of a tangent from the main topic, but if you've read this far, even though I didn't get into the technical weeds of DevOps (or at least didn't dig deep, because let's be honest, the topic sounds boring in this day and age...), I think you now have a decent picture of what DevOps is, and why it matters, whether in traditional software development or in today's agent development, where it shows up wearing a different name: loops.

And broadly speaking, whether you call it loops or DevOps, they both share the exact same purpose and goal: increase speed, quality, security... (whatever else you want to slap in front of "Ops") and turn it into a perfect feedback loop (the "Ops" part), a self-improving loop for your software, your agent, or whatever else you want to develop (the "Dev" part).

## The future

Can a loop improve itself? Is there such a thing as a self-improving loop?

Possibly, but stability and safety are, in my view, absolutely critical in any self-evolution model, which is exactly why harness engineering is just as indispensable alongside agentic or loops engineering, the same way security and safety are indispensable in DevOps.

I'll get into this in a future post, and I'll try to lean into the less boring-sounding technical terms (I do think "agentic" and "harness" sound a lot less boring than "DevOps" or "Safety and Compliance," even though under the hood they're the same thing).

> So, what's your take: what future awaits software engineering once DevOps evolves all the way to the Autonomous level?
>
> Next time, we'll dig deeper into harness engineering, and the stability and safety any self-evolution model needs before it earns the right to call itself "grown up".
