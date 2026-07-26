// Exam Practice Skill for DSCG
// Génère des questions de pratique adaptatives en français

const fs = require('fs');
const path = require('path');

const DSCG_TOPICS = {
  'UE1': 'Advanced Accounting - Comptabilité approfondie',
  'UE2': 'Corporate Finance - Finance',
  'UE3': 'Management Control - Contrôle de gestion',
  'UE4': 'Tax Law - Droit fiscal',
  'UE5': 'Company Law - Droit des sociétés',
  'UE6': 'Audit & Information Systems'
};

const QUESTION_BANK = {
  'UE1': [
    {
      question: 'Comment comptabilise-t-on une provision pour risque et charges ?',
      options: [
        'Débit 6875 / Crédit 151',
        'Débit 151 / Crédit 6875',
        'Débit 6812 / Crédit 151',
        'Débit 151 / Crédit 6812'
      ],
      correct: 0,
      explanation: 'La dotation aux provisions est comptabilisée par le débit du compte 6875 (Dotations aux provisions pour risques et charges) et le crédit du compte 151 (Provisions pour risques).'
    },
    {
      question: 'Quel est le traitement comptable d\'un emprunt obligataire ?',
      options: [
        'Enregistrement au nominal uniquement',
        'Enregistrement au prix d\'émission avec comptabilisation de la prime de remboursement',
        'Enregistrement en charges immédiatement',
        'Pas d\'enregistrement comptable'
      ],
      correct: 1,
      explanation: 'L\'emprunt obligataire est enregistré au prix d\'émission. La différence entre le prix de remboursement et le prix d\'émission constitue la prime de remboursement à amortir.'
    }
  ],
  'UE4': [
    {
      question: 'Quel est le taux normal de TVA en France ?',
      options: ['5.5%', '10%', '20%', '33.33%'],
      correct: 2,
      explanation: 'Le taux normal de TVA en France est de 20%. Les taux réduits sont 10% et 5.5%.'
    }
  ]
};

class ExamPractice {
  constructor() {
    this.memoryDir = path.join(__dirname, '..', '..', 'memory');
    this.progressFile = path.join(this.memoryDir, 'dscg_progress.json');
    this.progress = this.loadProgress();
  }

  loadProgress() {
    if (fs.existsSync(this.progressFile)) {
      return JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
    }
    return {
      scores: {},
      weaknesses: [],
      totalAnswered: 0,
      correctAnswers: 0,
      startedAt: new Date().toISOString()
    };
  }

  saveProgress() {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
    fs.writeFileSync(this.progressFile, JSON.stringify(this.progress, null, 2));
  }

  // Génère une question basée sur les faiblesses
  generateQuestion(ue = null) {
    let targetUE = ue;
    
    // Si pas d'UE spécifiée, choisir une faiblesse ou aléatoire
    if (!targetUE) {
      if (this.progress.weaknesses.length > 0) {
        targetUE = this.progress.weaknesses[0];
      } else {
        const ues = Object.keys(QUESTION_BANK);
        targetUE = ues[Math.floor(Math.random() * ues.length)];
      }
    }

    const questions = QUESTION_BANK[targetUE];
    if (!questions || questions.length === 0) {
      return { error: 'Pas de questions disponibles pour ' + targetUE };
    }

    const question = questions[Math.floor(Math.random() * questions.length)];
    
    return {
      ue: targetUE,
      ueName: DSCG_TOPICS[targetUE],
      question: question.question,
      options: question.options,
      questionId: targetUE + '_' + Math.random().toString(36).substr(2, 9)
    };
  }

  // Vérifie la réponse et met à jour les progrès
  checkAnswer(questionId, selectedOption, ue) {
    const questions = QUESTION_BANK[ue];
    const question = questions.find(q => questionId.startsWith(ue));
    
    if (!question) {
      return { error: 'Question non trouvée' };
    }

    const isCorrect = selectedOption === question.correct;
    
    // Mettre à jour les progrès
    if (!this.progress.scores[ue]) {
      this.progress.scores[ue] = { correct: 0, total: 0 };
    }
    this.progress.scores[ue].total++;
    this.progress.totalAnswered++;
    
    if (isCorrect) {
      this.progress.scores[ue].correct++;
      this.progress.correctAnswers++;
      
      // Retirer des faiblesses si amélioration
      if (this.progress.scores[ue].correct / this.progress.scores[ue].total > 0.7) {
        this.progress.weaknesses = this.progress.weaknesses.filter(w => w !== ue);
      }
    } else {
      // Ajouter aux faiblesses
      if (!this.progress.weaknesses.includes(ue)) {
        this.progress.weaknesses.push(ue);
      }
    }

    this.saveProgress();

    return {
      correct: isCorrect,
      correctAnswer: question.correct,
      explanation: question.explanation,
      score: this.getScore(ue),
      globalScore: this.getGlobalScore()
    };
  }

  getScore(ue) {
    if (!this.progress.scores[ue]) return '0% (0/0)';
    const s = this.progress.scores[ue];
    return Math.round((s.correct / s.total) * 100) + '% (' + s.correct + '/' + s.total + ')';
  }

  getGlobalScore() {
    if (this.progress.totalAnswered === 0) return '0% (0/0)';
    return Math.round((this.progress.correctAnswers / this.progress.totalAnswered) * 100) + '% (' + this.progress.correctAnswers + '/' + this.progress.totalAnswered + ')';
  }

  getProgress() {
    return {
      ...this.progress,
      globalScore: this.getGlobalScore(),
      byUE: Object.keys(this.progress.scores).reduce((acc, ue) => {
        acc[ue] = {
          name: DSCG_TOPICS[ue],
          score: this.getScore(ue)
        };
        return acc;
      }, {})
    };
  }
}

module.exports = ExamPractice;

// Test CLI
if (require.main === module) {
  console.log('=== EXAM PRACTICE - DSCG ===\n');
  
  const exam = new ExamPractice();
  
  // Générer une question
  const q = exam.generateQuestion('UE1');
  console.log('UE:', q.ue, '-', q.ueName);
  console.log('Question:', q.question);
  console.log('Options:');
  q.options.forEach((opt, i) => console.log('  ' + i + ': ' + opt));
  
  // Simuler une réponse
  console.log('\nRéponse choisie: 0');
  const result = exam.checkAnswer(q.questionId, 0, q.ue);
  console.log('Correct:', result.correct ? '✅' : '❌');
  console.log('Explication:', result.explanation);
  console.log('Score UE1:', result.score);
  console.log('Score global:', result.globalScore);
  
  console.log('\n=== TEST COMPLET ===');
  console.log('Module prêt pour le DSCG! 🎓');
}
