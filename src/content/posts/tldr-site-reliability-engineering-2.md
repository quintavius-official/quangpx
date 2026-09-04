---
title: "TL;DR Site Reliability Engineering #2"
pubDatetime: 2024-06-28T00:00:00Z
description: "Part 2 of the SRE series: understanding real user experience and system architecture as the foundation for picking the right SLIs and SLOs."
tags:
  - SRE
  - DevOps
featured: true
draft: false
lang: "en"
canonicalURL: "https://www.linkedin.com/pulse/tldr-site-reliability-engineering-2-quang-ph%C6%B0%C6%A1ng-oyjjc/"
---

> Originally published on [LinkedIn](https://www.linkedin.com/pulse/tldr-site-reliability-engineering-2-quang-ph%C6%B0%C6%A1ng-oyjjc/) on Jun 28, 2024. This is the follow-up to [TL;DR Site Reliability Engineering](/posts/tldr-site-reliability-engineering).

## Recap

Hi folks, and thank you very much for your attention to this article in the #SRE series! On my very first article about SRE, I received a lot of good feedback and other perspectives from colleagues. Special thanks to Khoa for helping me recognize that stability is also an important part of product reliability and quality.

Before talking about part 2, let's sum up the important points I shared in part 1. There are 3 critical factors that every SRE team should have:

1. **A good understanding of real user experience** in using the product. When the team understands the user experience, they can understand its goal and what the user wants in production.
2. **A good monitoring framework** built for the product to ensure its reliability (in detail, SRE needs a good SLI, SLO and SLA). The sooner the SRE team detects an issue, the less the customer is impacted.
3. **Good practices for system failures**, degraded performance, or even outages. The more scenarios the team practices and successfully remediates, the lower the risk of customer-facing failures.

Now, let's go into the first factor of SRE best practices.

## Good understanding of real user experience

Good product engineering goes hand in hand with a thorough understanding of product specifications by the engineering team. To gain insight into the real user experience, the SRE team needs to review product or software specifications. They should also collaborate effectively with the product management team to agree on user requirements, especially those related to SLOs/SLAs. Although this is primarily the responsibility of business analysts, as part of the engineering team, SRE should also:

- Try out new features yourself, even if they're only in the dev environment. This gives you firsthand insight into what's important for users.
- Collaborate regularly with the engineering team during feature development. The earlier SRE has insight into a new feature, the better visibility the team has to set up monitoring indicators.
- Document your findings in runbooks, guidelines, or knowledge bases. This helps build a comprehensive understanding of the real user experience, and gives the engineering team a good tech wiki to reference.
- Participate in root cause analysis for any issues early on. Identifying root causes provides visibility into preventing future problems, or problems in higher environments.

Here's an example of a functional use case in product specifications, where each step represents a user flow. Each flow has its own user expectations, something SREs should pay close attention to. Let's assume we have a new release on our search engine page, which includes a new button for uploading files to search.

**Use case: Search by file**

## Understand your system architecture

The first step in defining indicators, once we have a good understanding of the user experience, is to have an overall view of your system architecture. In other words, you need to know which elements in the system can impact the user experience.

Using the previous example, I'd like to know which components in the search engine system affect my search results when I use a file to search. To thoroughly understand this use case, we should examine the system architecture and create a component diagram or flow chart. This gives us a comprehensive list of components that need monitoring.

*(The original article includes system architecture and request-flow diagrams for this "search by file" use case, see the LinkedIn post linked above for the visuals.)*

Here's a breakdown of the components we need to monitor for user experience in terms of performance:

- Search result UI component
- Search services
- Other microservices (simplified here)
- Caching
- Databases

### User experience: search-by-file performance

Assuming the performance thresholds above are still acceptable to users, I used percentiles instead of fixed numbers when defining them. Percentiles are almost always the better choice for this type of request/response performance measurement.

Once we have the metrics and thresholds, we need to select the appropriate SLI and SLO. It's not feasible to use every metric as an SLI or SLO. Based on my experience, a single SLO can be backed by multiple metrics, but assigning an SLO to every metric individually leads to chaos in monitoring for the SRE team.

## Summary

The example above illustrates a basic representation of performance-based user experience. Other vital factors to consider include search service availability, search result accuracy, and accurate UI display, among others. Defining SLO and SLA requires collaboration among SRE leaders, product managers, and engineering leaders, to select customer-valued metrics and establish a practical plan to improve the system to meet the SLO/SLA.

In the next article, I'll discuss SLI, SLO, and SLA definitions, based on our understanding of user experience and system architecture, and our contributions to the monitoring framework.

Got any questions, worries, or want to share your own story? Feel free to leave a comment.
