import { useState } from "react";
import { Edit, Search, Trash2, Users } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useApiData } from "../../hooks/useApiData";
import { apiRequest } from "@/src/lib/api";
import { formatDate, formatRoleLabel } from "@/src/lib/presentation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: "CITIZEN" | "EMPLOYEE" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
  createdAt?: string | null;
  department?: {
    name: string;
  } | null;
};

function getRoleBadgeClasses(role: AdminUser["role"]) {
  if (role === "SUPER_ADMIN" || role === "DEPARTMENT_ADMIN") {
    return "bg-purple-100 text-purple-700";
  }

  if (role === "EMPLOYEE") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function UserManagement() {
  const user = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const { data, error, loading } = useApiData(
    () => apiRequest<AdminUser[]>("/users"),
    [user?.id]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading users..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load users</AlertTitle>
          <AlertDescription>{error ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredUsers = data.filter((record) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return true;
    }

    return (
      record.fullName.toLowerCase().includes(normalizedSearch) ||
      record.email.toLowerCase().includes(normalizedSearch) ||
      record.id.toLowerCase().includes(normalizedSearch)
    );
  });

  const totalUsers = data.length;
  const activeUsers = data.filter((record) => record.isActive).length;
  const employees = data.filter((record) => record.role === "EMPLOYEE").length;
  const administrators = data.filter((record) =>
    ["DEPARTMENT_ADMIN", "SUPER_ADMIN"].includes(record.role)
  ).length;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage citizens, employees, and administrators</p>
        </div>
        <Button disabled>
          <Users className="size-4 mr-2" />
          Live Directory
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <Users className="size-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
          <div className="text-sm text-muted-foreground">Active</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-primary">{employees}</div>
          <div className="text-sm text-muted-foreground">Employees</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-purple-600">{administrators}</div>
          <div className="text-sm text-muted-foreground">Administrators</div>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <Button variant="outline" disabled>
            Filter
          </Button>
        </div>
      </Card>

      <Card>
        {filteredUsers.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No users matched the search query.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-xs">{record.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>
                    <div className="font-medium">{record.fullName}</div>
                    <div className="text-xs text-muted-foreground">{record.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeClasses(record.role)}>
                      {formatRoleLabel(record.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.department?.name || "-"}</TableCell>
                  <TableCell>
                    <Badge className={record.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                      {record.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(record.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled>
                        <Edit className="size-3" />
                      </Button>
                      <Button size="sm" variant="outline" disabled>
                        <Trash2 className="size-3 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
