"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Edit,
  Save,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../../lib/db/_legacy-prisma-stubs"; // TEMP: redirected from broken "../../app/generated/prisma"

interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  tokens: number;
  tokensExpiresAt: Date | null;
  subscriptions: any[];
  _count: {
    subscriptions: number;
    paymentHistory: number;
  };
}

interface UserManagementProps {
  users: User[];
  onUserUpdate: (
    userId: string,
    updates: { role?: UserRole; tokens?: number; tokensExpiresAt?: Date }
  ) => void;
}

export default function UserManagement({
  users,
  onUserUpdate,
}: UserManagementProps) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    role: UserRole;
    tokens: string;
    tokensExpiresAt: Date | undefined;
  }>({
    role: UserRole.USER,
    tokens: "0",
    tokensExpiresAt: undefined,
  });
  const [updating, setUpdating] = useState<{ [key: string]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  const startEditing = (user: User) => {
    setEditingUser(user.id);
    setEditData({
      role: user.role,
      tokens: user.tokens.toString(),
      tokensExpiresAt: user.tokensExpiresAt
        ? new Date(user.tokensExpiresAt)
        : undefined,
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditData({
      role: UserRole.USER,
      tokens: "0",
      tokensExpiresAt: undefined,
    });
  };

  const saveChanges = async (userId: string) => {
    const tokens = parseInt(editData.tokens);
    if (isNaN(tokens) || tokens < 0) {
      toast.error("Please enter a valid number of tokens");
      return;
    }

    setUpdating((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: editData.role,
          tokens,
          tokensExpiresAt: editData.tokensExpiresAt?.toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to update user");

      onUserUpdate(userId, {
        role: editData.role,
        tokens,
        tokensExpiresAt: editData.tokensExpiresAt,
      });
      setEditingUser(null);
      toast.success("User updated successfully");
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setUpdating((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "destructive";
      case UserRole.PREMIUM:
        return "default";
      case UserRole.BANNED:
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDate = (date: string | Date | null) => {
    return date ? new Date(date).toLocaleDateString() : "Never";
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    if (editingUser) {
      cancelEditing();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, users.length)} of{" "}
          {users.length} users
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Tokens</th>
                <th className="text-left p-3 font-medium">Token Expiry</th>
                <th className="text-left p-3 font-medium">Subscription</th>
                <th className="text-left p-3 font-medium">Stats</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{user.name || "No name"}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </td>
                  <td className="p-3">
                    {editingUser === user.id ? (
                      <select
                        value={editData.role}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            role: e.target.value as UserRole,
                          }))
                        }
                        disabled={updating[user.id]}
                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value={UserRole.USER}>USER</option>
                        <option value={UserRole.PREMIUM}>PREMIUM</option>
                        <option value={UserRole.ADMIN}>ADMIN</option>
                        <option value={UserRole.BANNED}>BANNED</option>
                      </select>
                    ) : (
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    {editingUser === user.id ? (
                      <Input
                        type="number"
                        min="0"
                        value={editData.tokens}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            tokens: e.target.value,
                          }))
                        }
                        disabled={updating[user.id]}
                        className="w-20 h-8"
                      />
                    ) : (
                      <span className="text-sm">{user.tokens}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {editingUser === user.id ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-start text-left font-normal"
                            disabled={updating[user.id]}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editData.tokensExpiresAt ? (
                              format(editData.tokensExpiresAt, "PP")
                            ) : (
                              <span className="text-muted-foreground">
                                Pick date
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={editData.tokensExpiresAt}
                            onSelect={(date) =>
                              setEditData((prev) => ({
                                ...prev,
                                tokensExpiresAt: date,
                              }))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span className="text-sm">
                        {formatDate(user.tokensExpiresAt)}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-sm">
                      {user.subscriptions.length > 0
                        ? user.subscriptions[0].stripeProduct?.name || "Active"
                        : "None"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {user._count.subscriptions} subs •{" "}
                      {user._count.paymentHistory} payments
                    </span>
                  </td>
                  <td className="p-3">
                    {editingUser === user.id ? (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          onClick={() => saveChanges(user.id)}
                          disabled={updating[user.id]}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={updating[user.id]}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  return (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  );
                })
                .map((page, index, array) => (
                  <div key={page} className="flex items-center">
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </Button>
                  </div>
                ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
