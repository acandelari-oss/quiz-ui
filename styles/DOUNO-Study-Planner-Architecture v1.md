# DOUNO Study Planner — Architecture v1

## Purpose

The Study Planner is responsible for transforming a student's project into a structured, personalized weekly study plan.

Its responsibility is planning.

Learning content generation (Quiz, Flashcards, Professor narratives) is delegated to dedicated engines.

---

# Architectural Principles

The Planner follows a strict orchestration model.

Each module has a single responsibility.

The Planner Engine coordinates the pipeline but never duplicates planning logic.

Every module is deterministic and independently testable.

The Planner domain remains independent from:

* FastAPI
* Database
* ORM
* OpenAI
* Frontend

The Planner can therefore evolve independently from infrastructure and AI providers.

---

# Planner Pipeline

```text
PlannerContext
        │
        ▼
Category Selector
        │
        ▼
Session Allocator
        │
        ▼
Weekly Scheduler
        │
        ▼
Activity Planner
        │
        ▼
Professor Bridge
        │
        ▼
Week
```

---

# Module Responsibilities

## Planner Engine

Coordinates the complete planning pipeline.

Responsibilities:

* receive PlannerContext
* orchestrate Planner modules
* produce a complete Week

The Planner Engine contains no educational decision logic.

---

## Category Selector

Determines which categories deserve the highest priority.

Uses educational analytics such as:

* accuracy
* coverage
* review recency
* priority weights

Output:

Ordered category priorities.

---

## Session Allocator

Determines how much of a category fits into one study session.

Responsibilities:

* preserve topic order
* split large categories into consecutive segments
* never skip topics
* never duplicate topics
* respect available study time

Output:

CategoryAllocation objects.

---

## Weekly Scheduler

Distributes CategoryAllocation objects across the available weekly sessions.

Responsibilities:

* preserve educational priority
* maximize available study time
* never exceed session budget
* keep segmented categories as close together as possible

Output:

DailyPlan objects containing planned allocations.

---

## Activity Planner

Transforms planned allocations into executable learning activities.

Each allocation becomes:

Flashcards

↓

Quiz

The Activity Planner configures activities only.

It never generates learning content.

---

## Professor Bridge

Prepares the narrative structure of the Planner.

Responsibilities:

* weekly briefing
* daily objective
* daily briefing
* daily summary
* homework
* Active Recall
* Office Hours

The Professor Bridge never generates AI content directly.

Its role is to prepare the context that will later be consumed by the Professor Engine.

---

# Domain Philosophy

Planning and execution are separate concepts.

Planning estimates work.

Execution records reality.

Example:

Planning:

* estimated duration

Execution:

* actual duration
* completion
* statistics

These concepts must never be mixed.

---

# Topic Coverage

The Planner guarantees complete topic coverage.

Every selected topic must be represented at least once by:

* one Flashcard
* one Quiz question

Activities are never configured with fewer questions/cards than selected topics.

---

# Study Time Estimation

Students choose their preferred target exam pace.

Supported values:

* 60 sec/question
* 90 sec/question
* 120 sec/question

This value is used only during planning.

Execution records the student's real response time independently.

---

# Activity Lifecycle

Planning:

Category

↓

Selected Topics

↓

Activity Configuration

Execution:

Activity

↓

Execution

↓

Result

Narrative:

Professor

↓

Briefing

↓

Debrief

↓

Homework

---

# Frontend Contract

The frontend consumes only the generated Week.

The frontend never performs planning logic.

The backend is the single source of truth.

---

# Future Evolution

The current architecture intentionally leaves room for future improvements.

Examples:

* adaptive planning
* spaced repetition
* confidence estimation
* exam profile optimization
* personalized Professor narratives
* Study Journal
* historical week comparison
* dynamic workload adjustment

These capabilities can be added without changing the Planner architecture.

---

# Guiding Principle

The Planner decides:

* what to study
* when to study
* how much to study

The learning engines decide:

* how to teach it

The Professor decides:

* how to explain it
* how to motivate it
* how to adapt it to the student

This separation keeps the Study Planner modular, testable and extensible while allowing each subsystem to evolve independently.
