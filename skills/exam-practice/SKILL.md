# Exam Practice Skill

Generate adaptive DSCG exam practice questions in French. Tracks scores, identifies weak areas, adapts difficulty, saves results to memory/.

## Commands

```javascript
const ExamPractice = require('./exam_practice.js');
const exam = new ExamPractice();

// Generate question (adaptive - targets weak areas)
const q = exam.generateQuestion();        // Auto-select weak area
const q = exam.generateQuestion('UE1');    // Specific UE

// Check answer
const result = exam.checkAnswer(q.questionId, 0, q.ue);
// Returns: { correct, correctAnswer, explanation, score, globalScore }

// Get progress
const progress = exam.getProgress();
```

## DSCG Topics Covered
- UE1: Comptabilité approfondie
- UE2: Finance
- UE3: Contrôle de gestion  
- UE4: Droit fiscal
- UE5: Droit des sociétés
- UE6: Audit & SI

## Features
- Adaptive difficulty (targets weak areas)
- Progress tracking per UE
- Score calculation
- Weakness identification
- Persistent storage
