import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Briefcase, Eye, EyeOff, PencilLine, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { apiRequest } from "@/src/lib/api";
import { formatDate } from "@/src/lib/presentation";
import { supabase } from "@/src/lib/supabase";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Textarea } from "../../components/ui/textarea";
import { useApiData } from "../../hooks/useApiData";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type EmployeeRecord = {
  id: string;
  name: string | null;
  email: string | null;
  department: string | null;
  employeeCode: string | null;
  gender: string | null;
  age: number | null;
  phone: string | null;
  status: string | null;
  dateOfBirth: string | null;
  aadharNumber: string | null;
  panNumber: string | null;
  permanentAddress: string | null;
  temporaryAddress: string | null;
  bankName: string | null;
  ifscCode: string | null;
  accountNumber: string | null;
  guardianName: string | null;
  relation: string | null;
  guardianPhone: string | null;
  pincode: string | null;
  category: string | null;
  createdAt: string | null;
  hasPassword?: boolean;
  passwordStorage?: string | null;
  passwordSecurity?: "missing" | "hashed" | "legacy-plaintext";
};

type SupabaseEmployeeRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  employee_code?: string | null;
  gender?: string | null;
  age?: number | null;
  status?: string | null;
  pincode?: string | null;
  created_at?: string | null;
  category?: string | null;
  permanent_address?: string | null;
  temporary_address?: string | null;
  bank_name?: string | null;
  ifsc_code?: string | null;
  account_number?: string | number | null;
  guardian_name?: string | null;
  relation?: string | null;
  guardian_phone?: string | number | null;
  aadhar_number?: string | number | null;
  pan_number?: string | null;
  password?: string | null;
};

type ProfileForm = {
  name: string;
  phone: string;
  department: string;
  status: string;
  category: string;
  pincode: string;
  permanentAddress: string;
  temporaryAddress: string;
  bankName: string;
  ifscCode: string;
  accountNumber: string;
  guardianName: string;
  relation: string;
  guardianPhone: string;
};

const emptyForm: ProfileForm = {
  name: "",
  phone: "",
  department: "",
  status: "Active",
  category: "",
  pincode: "",
  permanentAddress: "",
  temporaryAddress: "",
  bankName: "",
  ifscCode: "",
  accountNumber: "",
  guardianName: "",
  relation: "",
  guardianPhone: "",
};

const PAGE_SIZE = 10;

type PaginationEntry = number | "left-ellipsis" | "right-ellipsis";

function normalizeText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function nullableString(value: string | number | null | undefined) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function mapSupabaseEmployeeRow(row: SupabaseEmployeeRow): EmployeeRecord {
  const password = nullableString(row.password);
  const hasPassword = Boolean(password);
  const passwordSecurity = !hasPassword
    ? "missing"
    : password?.startsWith("$2")
      ? "hashed"
      : "legacy-plaintext";

  return {
    id: row.id,
    name: nullableString(row.name),
    email: nullableString(row.email),
    department: nullableString(row.department),
    employeeCode: nullableString(row.employee_code),
    gender: nullableString(row.gender),
    age: row.age ?? null,
    phone: nullableString(row.phone),
    status: nullableString(row.status),
    dateOfBirth: null,
    aadharNumber: nullableString(row.aadhar_number),
    panNumber: nullableString(row.pan_number),
    permanentAddress: nullableString(row.permanent_address),
    temporaryAddress: nullableString(row.temporary_address),
    bankName: nullableString(row.bank_name),
    ifscCode: nullableString(row.ifsc_code),
    accountNumber: nullableString(row.account_number),
    guardianName: nullableString(row.guardian_name),
    relation: nullableString(row.relation),
    guardianPhone: nullableString(row.guardian_phone),
    pincode: nullableString(row.pincode),
    category: nullableString(row.category),
    createdAt: nullableString(row.created_at),
    hasPassword,
    passwordStorage:
      passwordSecurity === "hashed"
        ? "Stored securely (hashed)"
        : passwordSecurity === "legacy-plaintext"
          ? "Legacy plaintext detected in DB"
          : "Not set",
    passwordSecurity,
  };
}

function mergeEmployeeRecord(current: EmployeeRecord, next: EmployeeRecord): EmployeeRecord {
  return {
    ...current,
    ...next,
  };
}

function employeeMatchesFilters(employee: EmployeeRecord, searchQuery: string, statusFilter: string) {
  const normalizedStatusFilter = statusFilter.trim().toLowerCase();

  if (
    normalizedStatusFilter !== "all" &&
    (employee.status?.trim().toLowerCase() ?? "") !== normalizedStatusFilter
  ) {
    return false;
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    employee.id,
    employee.name,
    employee.email,
    employee.phone,
    employee.employeeCode,
    employee.department,
    employee.pincode,
  ].some((value) => value?.toLowerCase().includes(normalizedSearch));
}

function isActive(status?: string | null) {
  const normalizedStatus = status?.trim().toLowerCase();
  return !["inactive", "disabled", "terminated", "blocked"].includes(normalizedStatus || "");
}

function toForm(employee: EmployeeRecord): ProfileForm {
  return {
    name: employee.name ?? "",
    phone: employee.phone ?? "",
    department: employee.department ?? "",
    status: employee.status ?? "Active",
    category: employee.category ?? "",
    pincode: employee.pincode ?? "",
    permanentAddress: employee.permanentAddress ?? "",
    temporaryAddress: employee.temporaryAddress ?? "",
    bankName: employee.bankName ?? "",
    ifscCode: employee.ifscCode ?? "",
    accountNumber: employee.accountNumber ?? "",
    guardianName: employee.guardianName ?? "",
    relation: employee.relation ?? "",
    guardianPhone: employee.guardianPhone ?? "",
  };
}

function display(value?: string | number | null) {
  if (value == null) {
    return "Not available";
  }

  const text = String(value).trim();
  return text || "Not available";
}

function maskSensitiveValue(
  value?: string | number | null,
  options: { showStart?: number; showEnd?: number } = {}
) {
  if (value == null) {
    return "Not available";
  }

  const text = String(value).trim();

  if (!text) {
    return "Not available";
  }

  const showStart = options.showStart ?? 0;
  const showEnd = options.showEnd ?? 4;
  const visibleCharacters = showStart + showEnd;

  if (text.length <= visibleCharacters) {
    return "\u2022".repeat(text.length);
  }

  return `${text.slice(0, showStart)}${"\u2022".repeat(text.length - visibleCharacters)}${text.slice(text.length - showEnd)}`;
}

function formatPasswordStorageStatus(profile: EmployeeRecord) {
  if (profile.passwordSecurity === "legacy-plaintext") {
    return profile.passwordStorage || "Legacy plaintext detected in DB";
  }

  if (profile.hasPassword) {
    return profile.passwordStorage || "Stored securely (hashed)";
  }

  return "Not set";
}

function DetailCard({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm text-gray-900">{display(value)}</p>
    </div>
  );
}

function buildPaginationItems(currentPage: number, totalPages: number): PaginationEntry[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "right-ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "left-ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "left-ellipsis", currentPage - 1, currentPage, currentPage + 1, "right-ellipsis", totalPages];
}

export default function Employees() {
  const user = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [profile, setProfile] = useState<EmployeeRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSensitiveDetails, setShowSensitiveDetails] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const { data: fetchedEmployees, error, loading } = useApiData(
    () =>
      apiRequest<EmployeeRecord[]>("/employees", {
        query: {
          search: deferredSearchQuery.trim() || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        },
      }),
    [user?.id, deferredSearchQuery, statusFilter, refreshKey]
  );

  const {
    data: fetchedProfile,
    error: profileError,
    loading: profileLoading,
    refetch: refetchProfile,
  } = useApiData(
    () => (profileId != null ? apiRequest<EmployeeRecord>(`/employees/${profileId}`) : Promise.resolve(null)),
    [user?.id, profileId]
  );

  useEffect(() => {
    if (fetchedEmployees) {
      setEmployees(fetchedEmployees);
    }
  }, [fetchedEmployees]);

  useEffect(() => {
    if (profileId == null) {
      setProfile(null);
      return;
    }

    if (fetchedProfile) {
      setProfile(fetchedProfile);
    }
  }, [fetchedProfile, profileId]);

  useEffect(() => {
    if (profile && !isEditing) {
      setForm(toForm(profile));
    }
  }, [isEditing, profile]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, statusFilter]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channel = supabase
      .channel("admin-employees-directory")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string }).id;

            if (!deletedId) {
              return;
            }

            setEmployees((currentEmployees) =>
              currentEmployees.filter((employee) => employee.id !== deletedId)
            );
            setProfile((currentProfile) =>
              currentProfile?.id === deletedId ? null : currentProfile
            );
            return;
          }

          const nextEmployee = mapSupabaseEmployeeRow(payload.new as SupabaseEmployeeRow);

          setEmployees((currentEmployees) => {
            const existingIndex = currentEmployees.findIndex(
              (employee) => employee.id === nextEmployee.id
            );
            const matchesCurrentFilters = employeeMatchesFilters(
              nextEmployee,
              deferredSearchQuery,
              statusFilter
            );

            if (!matchesCurrentFilters) {
              return existingIndex >= 0
                ? currentEmployees.filter((employee) => employee.id !== nextEmployee.id)
                : currentEmployees;
            }

            if (existingIndex >= 0) {
              return currentEmployees.map((employee, index) =>
                index === existingIndex ? mergeEmployeeRecord(employee, nextEmployee) : employee
              );
            }

            return [nextEmployee, ...currentEmployees];
          });

          setProfile((currentProfile) =>
            currentProfile?.id === nextEmployee.id
              ? mergeEmployeeRecord(currentProfile, nextEmployee)
              : currentProfile
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [deferredSearchQuery, statusFilter, user?.id]);

  const stats = useMemo(() => {
    if (!employees.length) {
      return { total: 0, active: 0, inactive: 0, departments: 0 };
    }

    return {
      total: employees.length,
      active: employees.filter((employee) => isActive(employee.status)).length,
      inactive: employees.filter((employee) => !isActive(employee.status)).length,
      departments: employees.filter((employee) => employee.department?.trim()).length,
    };
  }, [employees]);

  const totalEmployees = employees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return employees.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, employees]);

  const paginationItems = useMemo(
    () => buildPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const rangeStart = totalEmployees === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalEmployees);

  const openProfile = (employeeId: string) => {
    setProfileId(employeeId);
    setProfile(null);
    setProfileOpen(true);
    setIsEditing(false);
    setShowSensitiveDetails(false);
  };

  const closeProfile = (open: boolean) => {
    setProfileOpen(open);

    if (!open) {
      setIsEditing(false);
      setShowSensitiveDetails(false);
    }
  };

  const setField = (key: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = async () => {
    if (profileId == null) {
      return;
    }

    if (!form.name.trim()) {
      toast.error("Employee name is required.");
      return;
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      toast.error("Phone number must be a valid 10-digit number.");
      return;
    }

    if (form.guardianPhone.trim() && !/^\d{10}$/.test(form.guardianPhone.trim())) {
      toast.error("Guardian phone must be a valid 10-digit number.");
      return;
    }

    if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) {
      toast.error("Pincode must be a valid 6-digit number.");
      return;
    }

    try {
      setIsSaving(true);
      await Promise.all([
        apiRequest(`/users/registry/employees/${profileId}`, {
          method: "PUT",
          body: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            department: normalizeText(form.department),
            status: normalizeText(form.status),
            permanentAddress: normalizeText(form.permanentAddress),
            temporaryAddress: normalizeText(form.temporaryAddress),
            bankName: normalizeText(form.bankName),
            ifscCode: normalizeText(form.ifscCode)?.toUpperCase() ?? null,
            accountNumber: normalizeText(form.accountNumber),
            guardianName: normalizeText(form.guardianName),
            relation: normalizeText(form.relation),
            guardianPhone: normalizeText(form.guardianPhone),
          },
        }),
        apiRequest(`/employees/${profileId}`, {
          method: "PUT",
          body: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            department: form.department.trim(),
            category: form.category.trim(),
            permanentAddress: form.permanentAddress.trim(),
            temporaryAddress: form.temporaryAddress.trim(),
            guardianName: form.guardianName.trim(),
            guardianPhone: form.guardianPhone.trim(),
            pincode: form.pincode.trim(),
          },
        }),
      ]);
      refetchProfile();
      setRefreshKey((value) => value + 1);
      setIsEditing(false);
      toast.success("Employee profile updated successfully.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Employee profile could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading employees..." />
      </div>
    );
  }

  if (error || !fetchedEmployees) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load employees</AlertTitle>
          <AlertDescription>{error ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const detailFields = profile
    ? [
        { label: "Employee ID", value: profile.id },
        { label: "Employee Code", value: profile.employeeCode },
        { label: "Email", value: profile.email },
        { label: "Gender", value: profile.gender },
        { label: "Age", value: profile.age },
        { label: "Date of Birth", value: profile.dateOfBirth },
        { label: "Department", value: profile.department },
        { label: "Category", value: profile.category },
        { label: "Pincode", value: profile.pincode },
        { label: "Status", value: profile.status },
        { label: "Created", value: formatDate(profile.createdAt) },
      ]
    : [];

  const sensitiveFields = profile
    ? [
        { label: "Password Storage", value: formatPasswordStorageStatus(profile) },
        {
          label: "Aadhar Number",
          value: showSensitiveDetails ? display(profile.aadharNumber) : maskSensitiveValue(profile.aadharNumber)
        },
        {
          label: "PAN Number",
          value: showSensitiveDetails
            ? display(profile.panNumber)
            : maskSensitiveValue(profile.panNumber, { showStart: 3, showEnd: 1 })
        },
        {
          label: "Account Number",
          value: showSensitiveDetails
            ? display(profile.accountNumber)
            : maskSensitiveValue(profile.accountNumber)
        },
        {
          label: "IFSC Code",
          value: showSensitiveDetails ? display(profile.ifscCode) : maskSensitiveValue(profile.ifscCode, { showStart: 4, showEnd: 2 })
        },
        {
          label: "Guardian Phone",
          value: showSensitiveDetails
            ? display(profile.guardianPhone)
            : maskSensitiveValue(profile.guardianPhone)
        },
      ]
    : [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Briefcase className="size-3.5" />
          Employee directory
        </div>
        <h1 className="text-3xl font-bold text-gray-950">Employees</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          The employee list now loads directly from the employee directory database, so department and profile details stay in sync.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="border-gray-200 p-5"><p className="text-sm text-muted-foreground">Total Employees</p><p className="mt-2 text-3xl font-bold text-gray-950">{stats.total}</p></Card>
        <Card className="border-gray-200 p-5"><p className="text-sm text-muted-foreground">Active</p><p className="mt-2 text-3xl font-bold text-emerald-600">{stats.active}</p></Card>
        <Card className="border-gray-200 p-5"><p className="text-sm text-muted-foreground">Inactive</p><p className="mt-2 text-3xl font-bold text-slate-600">{stats.inactive}</p></Card>
        <Card className="border-gray-200 p-5"><p className="text-sm text-muted-foreground">Department Tagged</p><p className="mt-2 text-3xl font-bold text-blue-600">{stats.departments}</p></Card>
      </div>

      <Card className="mb-6 border-gray-200 p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search by name, email, phone, or employee code" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Employees</SelectItem>
              <SelectItem value="Active">Active Only</SelectItem>
              <SelectItem value="Inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="border-gray-200">
        {employees.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No employees matched the current filters.</div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[84px] pr-4 text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="font-medium text-gray-950">{employee.name || "Employee"}</div>
                      <div className="text-xs text-muted-foreground">{employee.email || "No email"}</div>
                    </TableCell>
                    <TableCell>{employee.department || "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 shadow-none ${isActive(employee.status) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                        {employee.status || "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(employee.createdAt)}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end">
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-9 border-gray-300"
                          onClick={() => openProfile(employee.id)}
                          aria-label={`View profile for ${employee.name || "employee"}`}
                          title="View profile"
                        >
                          <Eye className="size-4" />
                          <span className="sr-only">View profile</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {rangeStart}-{rangeEnd} of {totalEmployees} employees
              </p>

              {totalPages > 1 ? (
                <Pagination className="mx-0 w-auto justify-start md:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                          }
                        }}
                      />
                    </PaginationItem>

                    {paginationItems.map((item) => (
                      <PaginationItem key={typeof item === "number" ? item : `${item}-${currentPage}`}>
                        {typeof item === "number" ? (
                          <PaginationLink
                            href="#"
                            isActive={item === currentPage}
                            onClick={(event) => {
                              event.preventDefault();
                              setCurrentPage(item);
                            }}
                          >
                            {item}
                          </PaginationLink>
                        ) : (
                          <PaginationEllipsis />
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          if (currentPage < totalPages) {
                            setCurrentPage(currentPage + 1);
                          }
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      <Dialog open={profileOpen} onOpenChange={closeProfile}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Employee Profile</DialogTitle>
            <DialogDescription>
              Full employee details are loaded from the database, and editable fields can be updated here.
            </DialogDescription>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex min-h-[360px] items-center justify-center"><LoadingSpinner text="Loading employee profile..." /></div>
          ) : profileError || !profile ? (
            <Alert variant="destructive"><AlertTitle>Unable to load employee profile</AlertTitle><AlertDescription>{profileError ?? "Employee profile could not be loaded."}</AlertDescription></Alert>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                      <Briefcase className="size-3.5" />
                      Employee Code: {profile.employeeCode || `EMP-${profile.id}`}
                    </div>
                    <h2 className="mt-3 text-2xl font-bold text-gray-950">{profile.name || "Employee"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{profile.email || "No email available"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`border-0 shadow-none ${isActive(profile.status) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{profile.status || "Active"}</Badge>
                    <Badge className="border-0 bg-blue-100 text-blue-700 shadow-none">{profile.department || "Unassigned Department"}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <Card className="border-gray-200 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-950">Editable Profile</h3>
                      <p className="text-sm text-muted-foreground">Changes are synced through the backend update endpoints when you save.</p>
                    </div>
                    <Button
                      variant={isEditing ? "outline" : "default"}
                      onClick={() => {
                        if (isEditing) {
                          setForm(toForm(profile));
                          setIsEditing(false);
                          return;
                        }

                        setIsEditing(true);
                      }}
                    >
                      <PencilLine className="mr-2 size-4" />
                      {isEditing ? "Cancel Edit" : "Edit Profile"}
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" disabled={!isEditing} value={form.name} onChange={(event) => setField("name", event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" disabled={!isEditing} inputMode="numeric" maxLength={10} value={form.phone} onChange={(event) => setField("phone", event.target.value.replace(/\D/g, ""))} />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" disabled={!isEditing} value={form.department} onChange={(event) => setField("department", event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={form.status || "Active"} onValueChange={(value) => setField("status", value)} disabled={!isEditing}>
                        <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Disabled">Disabled</SelectItem>
                          <SelectItem value="Blocked">Blocked</SelectItem>
                          <SelectItem value="Terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input id="category" disabled={!isEditing} value={form.category} onChange={(event) => setField("category", event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input id="pincode" disabled={!isEditing} inputMode="numeric" maxLength={6} value={form.pincode} onChange={(event) => setField("pincode", event.target.value.replace(/\D/g, ""))} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <Label htmlFor="permanentAddress">Permanent Address</Label>
                      <Textarea id="permanentAddress" rows={3} disabled={!isEditing} value={form.permanentAddress} onChange={(event) => setField("permanentAddress", event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="temporaryAddress">Temporary Address</Label>
                      <Textarea id="temporaryAddress" rows={3} disabled={!isEditing} value={form.temporaryAddress} onChange={(event) => setField("temporaryAddress", event.target.value)} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input id="bankName" disabled={!isEditing} value={form.bankName} onChange={(event) => setField("bankName", event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input id="ifscCode" disabled={!isEditing} value={form.ifscCode} onChange={(event) => setField("ifscCode", event.target.value.toUpperCase())} />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input id="accountNumber" disabled={!isEditing} value={form.accountNumber} onChange={(event) => setField("accountNumber", event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="guardianName">Guardian Name</Label>
                      <Input id="guardianName" disabled={!isEditing} value={form.guardianName} onChange={(event) => setField("guardianName", event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="relation">Relation</Label>
                      <Input id="relation" disabled={!isEditing} value={form.relation} onChange={(event) => setField("relation", event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="guardianPhone">Guardian Phone</Label>
                      <Input id="guardianPhone" disabled={!isEditing} inputMode="numeric" maxLength={10} value={form.guardianPhone} onChange={(event) => setField("guardianPhone", event.target.value.replace(/\D/g, ""))} />
                    </div>
                  </div>
                </Card>

                <Card className="border-gray-200 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-950">DB Stored Details</h3>
                    <p className="text-sm text-muted-foreground">This section shows the full set of details currently stored in the employee database.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {detailFields.map((field) => (
                      <DetailCard key={field.label} label={field.label} value={field.value} />
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-amber-950">Sensitive Information</h4>
                        <p className="text-sm text-amber-800">
                          Sensitive identifiers stay masked by default. Password values are never shown directly.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                        onClick={() => setShowSensitiveDetails((current) => !current)}
                      >
                        {showSensitiveDetails ? (
                          <EyeOff className="mr-2 size-4" />
                        ) : (
                          <Eye className="mr-2 size-4" />
                        )}
                        {showSensitiveDetails ? "Hide Details" : "View Details"}
                      </Button>
                    </div>

                    {profile.passwordSecurity === "legacy-plaintext" ? (
                      <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        This employee record is using a legacy plaintext password in the database. Password reveal is blocked here; reset or migrate this credential to a hashed value.
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      {sensitiveFields.map((field) => (
                        <DetailCard key={field.label} label={field.label} value={field.value} />
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => closeProfile(false)}>Close</Button>
            <Button onClick={saveProfile} disabled={!isEditing || isSaving || profileId == null}>
              <Save className="mr-2 size-4" />
              {isSaving ? "Saving..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
