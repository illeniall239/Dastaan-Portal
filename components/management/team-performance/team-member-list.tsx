"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Mail, Briefcase } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  position: string | null;
  status: string;
}

interface TeamMemberListProps {
  members: TeamMember[];
  teamName: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 border-red-300",
  management: "bg-purple-100 text-purple-800 border-purple-300",
  content_creator: "bg-blue-100 text-blue-800 border-blue-300",
  evaluator: "bg-green-100 text-green-800 border-green-300",
  legal: "bg-yellow-100 text-yellow-800 border-yellow-300",
  finance: "bg-orange-100 text-orange-800 border-orange-300",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  management: "Management",
  content_creator: "Content Creator",
  evaluator: "Evaluator",
  legal: "Legal",
  finance: "Finance",
};

export function TeamMemberList({ members, teamName }: TeamMemberListProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-600" />
          Team Members
        </CardTitle>
        <CardDescription>
          {members.length} member{members.length !== 1 ? 's' : ''} in {teamName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No members assigned to this team yet
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10 bg-teal-100 text-teal-700">
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>

                {/* Member Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {member.name}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ${ROLE_COLORS[member.role] || ROLE_COLORS.content_creator}`}
                    >
                      {ROLE_LABELS[member.role] || member.role}
                    </Badge>
                    {member.status !== 'active' && (
                      <Badge variant="secondary" className="text-xs">
                        {member.status}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.position && (
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate">{member.position}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
