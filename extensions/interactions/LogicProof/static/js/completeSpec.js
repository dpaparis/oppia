// Copyright 2014 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Complete tests for LogicProof interaction JS.
 * @author Jacob Davis (jacobdavis11@gmail.com)
 */

var errorWrapper = function(dubiousFunction, input1, input2, input3, input4, input5, input6) {
  return function() {
    try {
      if(input1 === undefined) {
        dubiousFunction();
      } else if(input2 === undefined) {
        dubiousFunction(input1);
      } else if(input3 === undefined) {
        dubiousFunction(input1, input2);
      } else if(input4 === undefined) {
        dubiousFunction(input1, input2, input3);
      } else if(input5 === undefined) {
        dubiousFunction(input1, input2, input3, input4);
      } else if(input6 === undefined) {
        dubiousFunction(input1, input2, input3, input4, input5);
      } else {
        dubiousFunction(input1, input2, input3, input4, input5, input6);
      }
    } catch(err) {
      throw new Error(logicProofShared.renderError(
        err, logicProofData.BASE_GENERAL_MESSAGES,
        logicProofData.BASE_STUDENT_LANGUAGE));
    }
  }
};

describe('Full system', function() {
  var completeCheck = function(assumptionsString, targetString, proofString) {
    var questionInstance = logicProofStudent.buildInstance(
      LOGIC_PROOF_DEFAULT_QUESTION_DATA);
    var question = logicProofTeacher.buildQuestion(
      assumptionsString, targetString, questionInstance.vocabulary);
    questionInstance.assumptions = question.assumptions;
    questionInstance.results = question.results;
    questionInstance.language.operators = question.operators;

    var proof = logicProofStudent.buildProof(proofString, questionInstance);
    logicProofStudent.checkProof(proof, questionInstance);
  }

  it('should accept fully correct proofs', function() {

    expect(completeCheck('p', 'p', 'we know p')).toBeUndefined();

    // TODO: add back additional tests from commit 2d9335019521 when speed
    // issues are fixed.

    expect(
      completeCheck('∀x.(A(x)∧B(x))', '(∀x.A(x))∧(∀x.B(x))', [
        'given c',
        '  from ∀x.(A(x)∧B(x)) at c we have A(c)∧B(c)',
        '  from A(c)∧B(c) we have A(c)',
        'c was arbitrary so ∀x.A(x)',
        'given d',
        '  from ∀x.(A(x)∧B(x)) at d we have A(d)∧B(d)',
        '  from A(d)∧B(d) we have B(d)',
        'd was arbitrary so ∀x.B(x)',
        'from ∀x.A(x) and ∀x.B(x) have (∀x.A(x))∧(∀x.B(x))'].join('\n'))
      ).toBeUndefined();

  });

  it('should reject proofs with any error', function() {

    expect(function() {
      completeCheck('p', 'p', 'we knew p')
    }).toThrow('The phrase starting \'we\' could not be identified; please ' +
      'make sure you are only using phrases from the given list of vocabulary.');

    expect(function() {
      completeCheck('p', 'p', 'we know q')
    }).toThrow(
      'This line uses q, so you need to have an earlier line proving that q is true.');

    expect(function() {
      completeCheck('∀x.(A(x)∧B(x)), p', '(∀x.A(x))', [
        'given c',
        '  from ∀x.(A(x)∧B(x)) at c we have A(c)∧B(c)',
        '  from A(c)∧B(c) we have A(c)',
        'c was arbitrary so ∀x.A(x)',
        'from ∀x.A(x) and p have (∀x.A(x))∧p'].join('\n'))
    }).toThrow('We are trying to prove ∀x.A(x) so it should be given by the ' +
      'final line of the proof.');

    expect(function() {
      completeCheck('∀x.(A(x)∧B(x))', '(∀x.A(x))', [
        'given c',
        '  from ∀x.(A(x)∧B(x)) at c we have A(c)∧B(c)',
        '  from A(c)∧B(c) we have A(c)',
        'd was arbitrary so ∀x.A(x)'].join('\n'))
    }).toThrow('You haven\'t said where d comes from; if you want it to be arbitrary ' +
      'then add a preceding line saying \'Given d\'; alternatively you might ' +
      'want to take a particular d witnessing some existential formula.');

  });

  it ('should check proofs in less than 10 seconds', function() {
    var startTime = new Date().getTime();

    expect(
      completeCheck('', '~(A∨B)<=>~A∧~B', [
        'If ~(A∨B)',
        '  If A',
        '    from A we have A∨B',
        '    from A∨B and ~(A∨B) we have contradiction',
        '  Hence ~A',
        '  If B',
        '    from B we have A∨B',
        '    from A∨B and ~(A∨B) we have contradiction',
        '  Hence ~B',
        '  From ~A and ~B we have ~A∧~B',
        'Hence ~(A∨B)=>~A∧~B',
        'If ~A∧~B',
        '  If A∨B',
        '    If A',
        '      from ~A∧~B we have ~A',
        '      from A and ~A we have contradiction',
        '    If B',
        '      from ~A∧~B we have ~B',
        '      from B and ~B we have contradiction',
        '    we know A∨B and whichever is true we have ~(A∨B)',
        '    From A∨B and ~(A∨B) we have contradiction',
        '  Hence ~(A∨B)',
        'Hence (~A∧~B)=>~(A∨B)',
        'From ~(A∨B)=>~A∧~B and (~A∧~B)=>~(A∨B) we have ~(A∨B)<=>~A∧~B'
      ].join('\n'))
    ).toBeUndefined();

    var endTime = new Date().getTime();
    expect(endTime < startTime + 20000).toBe(true);
  });
});
