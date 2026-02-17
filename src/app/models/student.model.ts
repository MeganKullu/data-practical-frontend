// Matches your backend Student entity
export interface Student {
  studentId: number;
  firstName: string;
  lastName: string;
  dob: string;          // LocalDate comes as "yyyy-MM-dd" string from JSON
  studentClass: StudentClass;
  score: number;
}

// Enum for class filter dropdown (matches backend StudentClass enum)
export type StudentClass = 'Class1' | 'Class2' | 'Class3' | 'Class4' | 'Class5';

export const STUDENT_CLASSES: StudentClass[] = [
  'Class1', 'Class2', 'Class3', 'Class4', 'Class5'
];
