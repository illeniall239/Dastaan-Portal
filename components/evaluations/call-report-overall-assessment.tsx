"use client";

import { Card } from "@/components/ui/card";
import { Award } from "lucide-react";
import { calculateGrade, getGradeColorClasses } from "@/lib/validations/episodic-evaluations";

const defaultRatingScaleItems = [
  { range: "9.0 - 10.0", description: "High rating potential", color: "text-green-700" },
  { range: "7.0 - 8.9", description: "Rating potential audience appeal", color: "text-blue-700" },
  { range: "5.0 - 6.9", description: "Need improvement - Required editing or continuous supervision", color: "text-amber-700" },
  { range: "< 5.0", description: "Either unacceptable or need major re-writing and editing", color: "text-red-700" },
];

interface CallReportOverallAssessmentProps {
  average: number;
  gradeFn?: (score: number) => string;
  gradeColorFn?: (grade: string) => string;
  ratingScaleItems?: { range: string; description: string; color: string }[];
}

export function CallReportOverallAssessment({
  average,
  gradeFn,
  gradeColorFn,
  ratingScaleItems,
}: CallReportOverallAssessmentProps) {
  const grade = (gradeFn || calculateGrade)(average);
  const ratingColorClasses = (gradeColorFn || getGradeColorClasses)(grade);
  const scaleItems = ratingScaleItems || defaultRatingScaleItems;

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-6 w-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-900">Overall Assessment</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Average Score */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border-2 border-gray-200">
          <span className="text-sm font-medium text-muted-foreground mb-2">
            Average Score
          </span>
          <span className="text-6xl font-bold text-gray-900">
            {average.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground mt-2">
            out of 10.00
          </span>
          <div className="w-full mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all"
                style={{ width: `${(average / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rating Assessment */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border-2 border-gray-200">
          <span className="text-sm font-medium text-muted-foreground mb-4">
            Overall Rating
          </span>
          <div className={`text-center ${ratingColorClasses} text-lg px-6 py-4 bg-gray-50 rounded-lg border-2 border-gray-300`}>
            {grade}
          </div>
        </div>
      </div>

      {/* Rating Scale Reference */}
      <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="font-semibold text-sm text-gray-700 mb-3">Rating Scale</h4>
        <div className="space-y-2">
          {scaleItems.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 text-sm"
            >
              <span className="font-semibold text-gray-600 min-w-[80px]">{item.range}:</span>
              <span className={`${item.color} font-medium`}>{item.description}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
