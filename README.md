# GlowPath Fitness Tracker

### Agile Processes Group Project Repository

Welcome to the official repository for **GlowPath**, a lightweight health and fitness tracking web application developed as part of the COMP7039 Agile Processes group project. This repository contains the full website source code, datasets, and supporting documentation produced across Sprints 1 to 3.

GlowPath focuses on simple activity logging, clear visualisation, and AI-powered knowledge extraction to motivate users without overwhelming them with unnecessary complexity.

---

## About GlowPath

GlowPath was designed in response to the problem of fitness apps becoming overloaded with excessive analytics, social features and distractions. Many users want a clean, minimal solution that simply allows them to track their workouts and view their progress.

This project delivers exactly that, structured fully around Agile methodology and completed in three sprints as required by the module brief.

Key goals, as defined in our approved project summary:

* Fast manual workout entry
* Simple, clean charts and tables
* AI-powered insight generation using Perplexity API
* Interactive chatbot for fitness guidance
* Development using the Scrum framework, with full sprint artefacts

---

## What GlowPath Delivers

GlowPath meets all three mandatory components defined by the Agile Processes module specification:

### 1. Data Input

GlowPath allows users to:

* Manually input workout entries
* Upload and download CSV files
* Append new activities to a device-stored CSV
* Import structured fitness data modelled on the FitBit dataset

### 2. Data Presentation and Visualisation

The app presents data in:

* Interactive charts powered by Chart.js v3
* Filterable workout tables
* A profile area that displays historical data
* Responsive design optimised for desktop and mobile

These components satisfy the Sprint 2 requirement to visualise raw and processed data.

### 3. Knowledge Extraction

As required for Sprint 3, GlowPath provides:

* AI-powered insights using Perplexity API
* Interactive chatbot widget with quick-action buttons
* Weekly comparison insights
* Workout frequency summaries
* Simple motivational reminders
* Intelligent flags highlighting changes in user behaviour

---

## Agile Development Approach

GlowPath was developed entirely under the Scrum methodology outlined in the module's project brief and practices list.

Each sprint included:

* Sprint Planning
* Sprint Goals
* Sprint Backlogs with user stories, story points and acceptance criteria
* Daily standup tracking
* Burndown charts
* Retrospective documentation
* Evidence of team communication
* Velocity measurement
* Working code at each increment

Scrum Masters rotated each sprint, ensuring equal contribution across the team.

**Sprint Breakdown:**
* **Sprint 1 (50 story points):** Foundations - Website structure, data input, dataset preparation, CI/CD setup
* **Sprint 2 (64 story points):** Data Visualisation - Chart.js integration, filtering, responsive design
* **Sprint 3 (52 story points):** AI Integration - Perplexity API, chatbot widget, AWS deployment

**Total Story Points Completed:** 166 across all three sprints

---

## Repository Structure
/.github/workflows CI/CD GitHub Actions configuration
/.vscode VS Code settings
/assets Team member images, logo, UI elements
/public Main application files
/js JavaScript modules for data handling, visualisation, AI integration
home-glowpath.html Landing page
index-glowpath.html Main entry point
profile-glowpath.html User profile section with CSV upload/download
team-glowpath.html Meet the Team page
style-glowpath.css Main stylesheet
/data Sample datasets (glowpath_daily_dataset.csv, glowpath_sample_dataset.csv)
server.js Node.js backend server for Perplexity API integration
package.json Node.js dependencies
README.md This file
---

## Technologies Used

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Visualisation:** Chart.js v3
* **AI Integration:** Perplexity API for natural language insights
* **Backend:** Node.js with Express.js
* **Storage:** Browser localStorage API
* **CI/CD:** GitHub Actions with automated build validation
* **Deployment:** AWS EC2 (Amazon Linux) with PM2 process manager
* **Project Management:** Jira, Scrum framework

---

## Live Application

GlowPath is deployed and accessible online:

**Live URL:** [http://56.228.31.161:3000/home-glowpath.html](http://56.228.31.161:3000/home-glowpath.html)

**Deployment Details:**
* **Platform:** AWS EC2 (Amazon Linux)
* **Server:** Node.js with PM2 process manager
* **Port:** 3000

---

## Key Features

* Manual workout logging with validation
* CSV upload/download functionality
* Device-side CSV generation
* Chart and table filters by date and activity
* Visual progress insights with Chart.js
* Optional visibility toggles for graphs and tables
* AI-powered chatbot using Perplexity API
* Quick-action buttons for common fitness questions
* Automated workout reminders
* Weekly comparisons with change detection logic
* Clean interface optimised for simplicity
* Responsive design for mobile and desktop
* GitHub Actions CI/CD pipeline

---

## Dataset

GlowPath uses a simplified version of the FitBit activity dataset, reduced to essential fields for rapid development and demonstration in Agile sprints.

Included fields:

* Date
* Activity Type
* Duration
* Calories
* Steps (optional)
* Notes (optional user-added)

Sample datasets are provided in the `/data` folder for testing and knowledge extraction.

---

## Testing & Quality Assurance

* **Total Test Cases:** 31 (100% pass rate)
* **Testing Coverage:** 
  - Data Input: 23%
  - Data Visualisation: 26%
  - Responsive Design: 19%
  - AI Integration: 13%
  - CI/CD Pipeline: 10%
  - Integration Testing: 10%
* **Testing Environments:** Windows 11, macOS, iOS 26 (iPhone 15), iPadOS 26 (iPad Air)
* **Browsers Tested:** Chrome, Firefox, Safari (desktop & mobile)

Full test case documentation is available in the project report appendix.

---

## Deliverables

The repository includes:

* Complete Sprint 1, 2, and 3 documentation
* Sprint backlog and meeting notes for all sprints
* Burndown charts with velocity tracking
* Evidence of team communication (screenshots, meeting minutes)
* Working code aligned with each sprint goal
* Intermediate and final report outputs
* Presentation materials as required by the assessment rubric
* CI/CD pipeline configuration and logs

---

## Authors

* **Eoghan O'Donovan** - Sprint 1 Scrum Master
* **Vitalina Sapozhnik** - Sprint 2 Scrum Master
* **Bradley Neville** - Sprint 3 Scrum Master
* **Sean Foran** - Product Owner & Lead Presenter

---

## Supervisor

**Alex Vakaloudis**