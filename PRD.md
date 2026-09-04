# Product Requirements Document (PRD)
## CyberSentinel — AI-Powered Cybersecurity Awareness & Response Chatbot

**Document Version:** 1.0  
**Author:** Nitya Purushottam Patle  
**Date:** August 27, 2026  
**Status:** Draft for College Project Submission

### 1. Executive Summary

CyberSentinel is an AI-powered chatbot designed to help users understand, detect, and respond to cybersecurity threats in real time. It acts as a first line of defense for non-technical users and a productivity tool for security-aware users — answering questions about phishing, malware, safe browsing, password hygiene, and incident response, while also being able to actively analyze suspicious inputs (URLs, emails, file hashes) and flag risk.

The goal is to bridge the gap between complex cybersecurity concepts and everyday users who lack the technical background to protect themselves, while demonstrating a full-stack, RAG/agent-based AI system for academic evaluation.

### 2. Problem Statement
* Most cyberattacks (phishing, social engineering, credential theft) succeed because of user-level ignorance, not just technical vulnerabilities.
* Existing security tools are either too technical (SOC dashboards, SIEM tools) or too passive (static FAQ pages).
* There is no lightweight, conversational, always-available assistant that can educate, detect, and guide a user through a security concern in plain language.
* Organizations and individuals need a scalable, low-cost first-responder for common security queries before escalating to a human expert.

### 3. Goals & Objectives
| Goal | Description |
|---|---|
| G1 | Provide instant, accurate answers to cybersecurity questions (phishing, malware, VPNs, 2FA, etc.) |
| G2 | Detect and flag suspicious artifacts (URLs, email text, attachments) submitted by the user |
| G3 | Guide users step-by-step through incident response (e.g., "I clicked a phishing link, what now?") |
| G4 | Maintain conversational context and escalate to human/admin when confidence is low |
| G5 | Demonstrate a functioning agentic architecture suitable for academic evaluation (SIH/hackathon-grade) |

#### Non-Goals (Out of Scope for v1)
* Real-time network traffic monitoring or enterprise SIEM integration
* Acting as a replacement for antivirus/endpoint protection software
* Legal or compliance advice

### 4. Target Users / Personas
* **Naive/Casual Internet User** — wants simple answers: "Is this link safe?", "What is phishing?"
* **College Student / Junior Developer** — wants to learn secure coding and best practices.
* **IT Helpdesk / Small Business Admin** — wants a quick triage tool before escalating incidents.
* **Security Enthusiast (You/Evaluators)** — wants to see the chatbot's reasoning, detection logic, and architecture.

### 5. Key Features
#### 5.1 Core Chat (Must Have)
* Natural language Q&A on cybersecurity topics using an LLM + curated knowledge base (RAG).
* Context-aware multi-turn conversation (remembers earlier messages in session).
* Quick-reply suggestion chips (e.g., "Check a URL", "Report an incident", "Password tips").

#### 5.2 Threat Detection Tools (Must Have)
* **URL Scanner:** user pastes a URL → chatbot checks against known threat-intel APIs (e.g., VirusTotal, Google Safe Browsing) and heuristics (typosquatting, suspicious TLDs, redirect chains) → returns a risk verdict with reasoning.
* **Phishing Email Analyzer:** user pastes email text/headers → model flags red flags (urgency language, spoofed sender domain, mismatched links).
* **Password Strength & Breach Checker:** checks password strength locally (never stored) and cross-references breach databases (e.g., Have I Been Pwned API) using k-anonymity hashing.

#### 5.3 Guided Incident Response (Should Have)
* Decision-tree style guided flows: "I think I've been hacked" → step-by-step remediation checklist (change password, enable 2FA, revoke sessions, scan device).
* Downloadable incident summary/report at the end of a flow.

#### 5.4 Admin/Analytics Dashboard (Should Have)
* View common query categories, flagged threats, and chatbot confidence scores.
* Export logs for further analysis (anonymized).

#### 5.5 Escalation & Human Handoff (Could Have)
* If confidence score < threshold or user explicitly requests, chatbot offers to escalate/log a ticket for human review.

#### 5.6 Authentication & Personalization (Could Have)
* Optional login to save chat history and get personalized security posture tips.

### 6. User Flow (Primary Scenario)
1. User opens chatbot → greeted with quick-action suggestions.
2. User pastes a suspicious link.
3. Chatbot runs URL through detection pipeline (API + heuristic scoring).
4. Chatbot responds with a verdict (Safe / Suspicious / Malicious), explanation, and next steps.
5. If malicious, chatbot offers a guided incident-response checklist.
6. Session summary is optionally saved/exported.

### 7. Functional Requirements
| ID | Requirement | Priority |
|---|---|---|
| FR1 | System shall accept free-text user queries and return relevant, accurate responses | Must |
| FR2 | System shall analyze submitted URLs for phishing/malware risk | Must |
| FR3 | System shall analyze pasted email content for phishing indicators | Must |
| FR4 | System shall check password strength without storing the raw password | Must |
| FR5 | System shall maintain conversation context across a session | Must |
| FR6 | System shall provide a confidence score with each threat verdict | Should |
| FR7 | System shall log anonymized interaction data for the admin dashboard | Should |
| FR8 | System shall support guided, multi-step incident-response flows | Should |
| FR9 | System shall allow optional user authentication for history persistence | Could |
| FR10 | System shall escalate low-confidence or high-severity cases to a human reviewer queue | Could |

### 8. Non-Functional Requirements
* **Security:** No plaintext storage of sensitive data (passwords, tokens); all API keys server-side only; input sanitization to prevent prompt injection.
* **Performance:** Response latency under 3 seconds for text queries; under 6 seconds for URL/email analysis (external API dependent).
* **Reliability:** Graceful fallback response if LLM or third-party API is unavailable.
* **Scalability:** Stateless API layer so multiple instances can be load-balanced.
* **Privacy:** Compliance-minded design — no unnecessary PII collection; clear disclaimer that this is an educational/awareness tool, not a certified security product.
* **Usability:** Simple, accessible chat UI; mobile-responsive.

### 9. Proposed Tech Stack
| Layer | Technology | Notes |
|---|---|---|
| Frontend | React | Chat UI, quick-reply chips, dashboard |
| Backend / API | FastAPI (Python) | REST endpoints, orchestration layer |
| Agent / Orchestration | LangGraph | Multi-step reasoning: classify intent → route to tool (URL scan / email scan / Q&A) → respond |
| LLM | Claude / GPT via API | Core reasoning and natural language generation |
| Knowledge Base | Vector DB (e.g., FAISS/Chroma) + curated cybersecurity docs | RAG for accurate, up-to-date answers |
| Threat Intel APIs | VirusTotal, Google Safe Browsing, Have I Been Pwned | External verdicts for URLs/emails/passwords |
| Database | MongoDB | Chat logs, session data, analytics |
| Auth (optional) | JWT-based auth | For personalization feature |
| Deployment | Docker + cloud hosting (Render/Netlify/AWS free tier) | For demo purposes |

### 10. System Architecture (High Level)
```
User (Web UI - React)
        │
        ▼
FastAPI Gateway  ──►  Auth / Rate Limiting
        │
        ▼
LangGraph Agent Orchestrator
   ├── Intent Classifier Node
   ├── RAG Q&A Node ───────► Vector DB (cybersecurity knowledge)
   ├── URL Scanner Node ───► VirusTotal / Safe Browsing API
   ├── Email Analyzer Node ► Heuristic + LLM scoring
   ├── Password Checker Node ► HIBP API (k-anonymity)
   └── Escalation Node ────► Human review queue (MongoDB)
        │
        ▼
Response Formatter ──► React Chat UI
```

### 11. Success Metrics
* **Accuracy:** ≥90% correct verdicts on a labeled test set of known phishing/safe URLs.
* **User satisfaction:** Positive feedback rating on ≥80% of resolved queries (thumbs up/down).
* **Response time:** 95th percentile under 5 seconds.
* **Engagement:** Average session includes ≥3 user turns (indicates the bot is actually helping, not being abandoned).
* **Academic evaluation criteria:** Working demo, clear architecture diagram, documented edge-case handling, and measurable detection accuracy.

### 12. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| LLM hallucinating security advice | Ground responses in RAG knowledge base; add disclaimers; cite sources |
| Prompt injection via malicious pasted content (email/URL) | Sanitize/escape inputs before passing to LLM; treat pasted content as data, not instructions |
| Third-party API rate limits/downtime | Cache recent verdicts; fallback to heuristic-only scoring |
| False sense of security in users | Clear disclaimers that this is an awareness tool, not a guarantee |
| Scope creep for a college timeline | Strictly phase features (Must → Should → Could) and build MVP first |

### 13. Milestones / Suggested Timeline
| Phase | Deliverable | Duration |
|---|---|---|
| Phase 1 | Requirements, architecture, knowledge base curation | Week 1 |
| Phase 2 | Core chat + RAG Q&A working end-to-end | Week 2–3 |
| Phase 3 | URL scanner + email analyzer integration | Week 3–4 |
| Phase 4 | Password checker + guided incident-response flows | Week 4–5 |
| Phase 5 | Admin dashboard, polish UI, testing | Week 5–6 |
| Phase 6 | Documentation, demo prep, presentation | Week 6 |

### 14. Future Scope (Post-Submission)
* Browser extension for real-time link scanning while browsing.
* Integration with organizational SIEM/SOC tools for enterprise use.
* Multi-language support for wider accessibility.
* Voice-based interaction for accessibility.

### 15. Appendix
* **Disclaimer:** CyberSentinel is an educational prototype and should not be relied upon as a sole security solution.
* **Glossary:** Phishing, Malware, 2FA, RAG (Retrieval-Augmented Generation), k-anonymity, SIEM — to be expanded in final report.
