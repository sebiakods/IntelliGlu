# IntelliGlu v2 — AI-Powered ICU Glucose Management Platform
<p align="center">
  <img src="docs/images/intelliglu.PNG" width="100%">
</p>

<h1 align="center">IntelliGlu v2</h1>

<p align="center">
AI-powered Clinical Decision Support Platform for Intelligent ICU Glucose Monitoring and Personalized Insulin Dosing
</p>

<p align="center">
<img src="https://img.shields.io/badge/Python-3.11-blue">
<img src="https://img.shields.io/badge/FastAPI-Backend-009688">
<img src="https://img.shields.io/badge/Next.js-15-black">
<img src="https://img.shields.io/badge/TypeScript-5-blue">
<img src="https://img.shields.io/badge/OfflineRL-CQL-success">
</p>

**IntelliGlu** is an AI-powered clinical decision support platform designed to assist healthcare professionals with personalized insulin dosing in Intensive Care Units (ICUs). It combines **Offline Reinforcement Learning (Conservative Q-Learning)** with a modern web interface to generate safe, explainable insulin recommendations from patient glucose measurements.

> **Research Project:** Personalized insulin dosing using Offline Reinforcement Learning.

---

## ✨ Highlights

*  Conservative Q-Learning (CQL) recommendation engine
*  Interactive patient dashboard and glucose visualization
*  Clinician review, acceptance, or manual override of AI recommendations
*  Real-time glucose simulation
*  Safety-oriented dosing logic
*  FastAPI backend with a modern Next.js + Electron frontend
*  Docker-ready backend architecture

---

# What's New in v2

This release focuses on improving the reliability of the recommendation engine while expanding the clinical workflow.

## 🔧 Improvements

### Accurate High-Glucose Recommendations

The CQL heuristic has been corrected to properly handle extremely high glucose values.

Previously, glucose values above **400 mg/dL (4 g/L)** could incorrectly produce a **0 U insulin recommendation** due to a frontend heuristic inconsistency. The frontend and backend now share the same decision logic, ensuring consistent recommendations.

**Updated components**

* `frontend/lib/simulator.ts`
* `backend/app/rl/cql/inference.py`

---
---

# 📸 Application Screenshots

## Dashboard

<p align="center">
  <img src="docs/images/Dashboard.PNG" width="900">
</p>

---

## Patient Management

<p align="center">
  <img src="docs/images/patients.PNG" width="900">
</p>

---

## AI Recommendation Engine

<p align="center">
  <img src="docs/images/recommandations.PNG" width="900">
</p>

---

## Glucose Simulator

<p align="center">
  <img src="docs/images/similatorr.PNG" width="900">
</p>

---

## Analytics

<p align="center">
  <img src="docs/images/analytics.PNG" width="900">
</p>

---

## Alerts

<p align="center">
  <img src="docs/images/Alerts.PNG" width="900">
</p>

---

## Settings

<p align="center">
  <img src="docs/images/settings.PNG" width="900">
</p>

---
### Robust Model Loading

The model loader now automatically detects the state dimension stored inside the trained checkpoint instead of relying on a fixed value.

This prevents incompatibilities when loading models trained with different feature sets.

**Updated component**

* `backend/app/rl/cql/model_loader.py`

---

### Complete Patient Management API

The patient and recommendation modules have been expanded from placeholders into fully functional REST APIs.

Features include:

* Patient CRUD operations
* Recommendation retrieval
* Recommendation application
* Integration with the CQL inference engine

---

## 🚀 New Features

### Dual Patient Management

The application now separates:

* Built-in dataset patients
* Newly created patients

New patients are stored independently using **localStorage**, preserving the original dataset.

---

### Interactive Dashboard

Select any patient directly from the dashboard to instantly view:

* Current glucose
* AI-generated insulin recommendation
* Supporting information

---

### Simulator → Recommendation Workflow

Simulation results can now be transferred directly to the Recommendations page.

Clinicians can:

* Review the proposed dose
* Accept the recommendation
* Override it manually
* Select a different insulin dose when needed

---

### Improved User Experience

The interface has been redesigned with:

* DM Sans typography
* Modern color system
* Improved badges
* Status indicators
* Smoother animations
* Better overall consistency

---

# Technology Stack

### Backend

* FastAPI
* Python
* Offline Reinforcement Learning (CQL)
* REST API
* Docker

### Frontend

* Next.js
* TypeScript
* React
* Electron
* Tailwind CSS

---

# Project Structure

```text
backend/
├── api/
├── core/
├── db/
├── rl/
│   ├── cql/
│   ├── ope/
│   └── safety/
├── services/
└── schemas/

frontend/
├── app/
│   ├── dashboard/
│   ├── patients/
│   ├── recommendations/
│   ├── simulator/
│   ├── analytics/
│   ├── reports/
│   └── settings/
├── components/
├── hooks/
├── services/
├── lib/
└── electron/
```

---

# Getting Started

## Backend

```bash
cd backend/app
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at:

```
http://localhost:3000
```

---


# Glucose Units

Internally, IntelliGlu performs all calculations in **mg/dL** while displaying values in both **mg/dL** and **g/L** for convenience.

| Glucose           | Expected Recommendation |
| ----------------- | ----------------------- |
| 300 mg/dL (3 g/L) | Medium-High (4–6 U)     |
| 400 mg/dL (4 g/L) | High (≥ 6 U)            |

---

# Vision

IntelliGlu aims to bridge cutting-edge Offline Reinforcement Learning research with practical clinical decision support. The long-term goal is to provide transparent, reliable, and safety-aware AI assistance that complements clinician expertise rather than replacing it.
