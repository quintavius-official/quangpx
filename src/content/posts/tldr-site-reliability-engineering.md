---
title: "TL;DR Site Reliability Engineering"
pubDatetime: 2024-06-12T00:00:00Z
description: "A practical, real-world look at what SRE actually does, plus the top 7 misunderstandings about the role that I keep running into with colleagues."
tags:
  - SRE
  - DevOps
featured: true
draft: false
lang: "en"
canonicalURL: "https://www.linkedin.com/pulse/tldr-site-reliability-engineering-quang-ph%C6%B0%C6%A1ng-knclc/"
---

> Originally published on [LinkedIn](https://www.linkedin.com/pulse/tldr-site-reliability-engineering-quang-ph%C6%B0%C6%A1ng-knclc/) on Jun 12, 2024.

## Context

Many articles about Site Reliability Engineering (SRE) focus on the concept, such as Service Level Indicators (SLI), Service Level Objectives (SLO), Service Level Agreements (SLA), error budgets, and so on. However, I often found myself lost and unable to find practical information for real-world contexts. With this blog, my first about SRE, I aim to provide a clearer picture of SRE in practice. I hope it helps guide those who, like my past self, are seeking direction in their SRE careers or engineering careers.

## What exactly does SRE do?

In short, SRE is Engineering, and its title is all about the responsibilities an engineer should have: the reliability of the system (or Site in the title).

However, when you're talking about reliability, you're talking about everything in engineering, such as availability, resilience, scalability, security, compliance, and even cost, at least in the context of software engineering, which is my area of specific expertise. Why? The answer might be very simple: customers can forgive a bug in software (or its low quality), but they rarely forgive a product that lacks reliability. For example, let's imagine you want to use Google. It's acceptable if it sometimes returns some wrong search results, but what if the site crashed every time you visited, or in a milder scenario, it took too long to search for something on Google? Then what are the consequences? You'd give up and switch to another search engine, or maybe an alternative solution like ChatGPT.

## SRE responsibility

To keep users satisfied with your product, and even interested in trying new paid features in the future, your current system and new features need to have adequate reliability for the users. The SRE team is responsible for ensuring this reliability.

In my point of view, there are 3 critical factors that every SRE team should have:

1. **A good understanding of real user experience** in using the product. When the team understands the user experience, they can understand its goal and what the user wants in production.
2. **A good monitoring framework** built for the product to ensure its reliability (or in detail, SRE needs a good SLI, SLO and SLA). When the SRE team builds a good monitoring framework, they can observe issues better in the production environment. The sooner the SRE team detects an issue, the less the customer is impacted.
3. **Good practices for system failures**, degraded performance, or even outages. When putting SRE in a customer situation that feels unsatisfying, we can have a proper solution to avoid this unexpected experience. The more scenarios the team practices and successfully remediates, the lower the risk of customer-facing failures.

## Top 7 misunderstandings about SRE

"What are people's current thoughts and perspectives on site reliability engineering (SRE)?"

These are the top 7 misunderstandings that I frequently encounter from my colleagues, which I believe I should write down in the hopes of improving understanding around SRE for myself and others.

**SRE is more about the operations of a product.** SRE partially manages operational tasks like infrastructure maintenance and deployment. Its primary role is to upgrade infrastructure with minimal impact on production. However, as an engineering team, SRE also develops monitoring frameworks, follows processes like escalation or Agile, and continuously improves these frameworks. In my current company, we applied Agile best practices to manage the SRE team so we could improve the monitoring framework continuously.

**SRE is all about production operations.** As I said earlier, the SRE team is also an engineering team that develops and continuously improves the monitoring framework. So the team also has a nonprod environment to do so. Depending very much on the team and product structure, the development environment of the monitoring framework can be decoupled from the main application environment, or it can be the same environment. At my current company, we do it in a mixed mode: for larger products we employ decoupling, but for smaller ones we keep it simple.

**SRE and DevOps have the same responsibility.** Communication between SRE and DevOps teams is crucial for understanding how system deployment and operational tasks like patching can affect customer experience. However, the responsibilities of each team can vary significantly. From my observations, the roles of SRE and DevOps are often combined into one, particularly in companies with smaller product sizes. This allows one or two DevOps people to manage the production environment. However, as the product expands, relying on a single role to handle multiple tasks concurrently may not be the most effective approach.

**SRE practices are limited to cloud-based products.** There's a benefit for SRE if the product is already cloud-native, as the team can have a simpler solution for the monitoring framework on the cloud and seamless integration with API clients or browser clients. However, with on-premise solutions, the way we collect monitoring data is different, because not every customer wants the client to connect to the cloud due to security and privacy concerns. In fact, we still use the monitoring framework and apply SRE practices in both cases, but the way we collect data or the solution we deploy for the monitoring framework is different.

**SRE is a Service Desk team.** SRE maintains its own on-call rotation and incident management and response, separate from the IT Service Desk team. Their scopes differ: the IT Service Desk team handles internal issues like email systems or company device incidents, while SRE concentrates on end customers who use the company's products or services.

**SRE is part of the Customer Support team.** Like Customer Support, SRE also has a channel for customer engagement where any team can raise an incident or support ticket for SRE to handle in a timely manner (meeting the ticket SLA). But the scope is different: Customer Support handles varied tickets and problems from customers, such as questions about legal matters or billing issues, while SRE handles issues related to product or service reliability, which can require engineering troubleshooting skills and a monitoring framework.

**We should review every item in the Google SRE book to establish a robust SRE practice.** Google, the originator of the SRE concept, has extensive resources that anyone can access and follow. While our system may not be as large as Google's, we can still learn from their successful practices, tailored to our specific use cases. I find the "Toil" section and the "What qualifies as Engineering" sub-section of Google's SRE book particularly insightful. However, I believe the "Testing for Reliability" section could benefit from an update to incorporate the recent adoption of chaos engineering in SRE for more effective testing.

## How is an SRE team structured in an organization?

"What is the optimal structure of an SRE team to lead an organization to success?"

In my current company, the SRE team has a distinctive structure. At times, we operate in a decoupled manner from the larger development team, which we call the centralized model. Alternatively, we integrate with the smaller development teams, known as the decentralized model. In the centralized model, we're exempt from development team activities like Agile or daily scrum meetings. In the decentralized model, we participate in these meetings.

So here's the deal: if a product is growing quickly, switching from a coupled model to a decoupled model can be very beneficial. This switch allows the SRE team to focus on system reliability, which leads to happier customers, while freeing up the product team to focus solely on their roadmap and release schedule. It's a win-win situation.

## Conclusion

So you might be wondering, why didn't I share any details on the tech stack, checklists, or templates in this article? As I mentioned, the focus here is really on the practices rather than the specifics. In this very first article on SRE, I wanted to concentrate on answering the WHAT and WHY questions, and give you a high-level overview of how we structured the SRE team to get the ball rolling. I'll dive into more of the nuts and bolts in the next one.

These WHAT and WHY points have been invaluable in guiding me on how to build a successful SRE team. This model has enabled my team to migrate legacy systems to new tech without a single outage or performance degradation, in some cases even improving performance while minimizing errors and costs.

That's about it for this article. In the next one, I'll share more of my experience to answer the "how" question.
