import type { TestResult, TestSession } from '../types/domain'

export const toTestSessionDocument = ({
  testSessionId,
  ...document
}: TestSession) => {
  void testSessionId
  return document
}

export const toTestResultDocument = ({
  testResultId,
  ...document
}: TestResult) => {
  void testResultId
  return document
}
