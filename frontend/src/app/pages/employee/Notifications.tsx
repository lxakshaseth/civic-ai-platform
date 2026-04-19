import { Bell, CheckCircle2 } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useApiData } from "../../hooks/useApiData";
import { apiRequest } from "@/src/lib/api";
import { formatShortDate } from "@/src/lib/presentation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function EmployeeNotifications() {
  const user = useCurrentUser();
  const { data, error, loading } = useApiData(
    () =>
      apiRequest<NotificationRecord[]>("/notifications", {
        query: { limit: 50 },
      }),
    [user?.id]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading employee notifications..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load notifications</AlertTitle>
          <AlertDescription>{error ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-muted-foreground">Task updates, ticket alerts, and workflow events.</p>
      </div>

      <div className="space-y-4">
        {data.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            You have no employee notifications right now.
          </Card>
        ) : (
          data.map((notification) => (
            <Card key={notification.id} className={`p-6 ${!notification.isRead ? "bg-blue-50" : ""}`}>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  {notification.isRead ? (
                    <CheckCircle2 className="size-5 text-green-600" />
                  ) : (
                    <Bell className="size-5 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold">{notification.title}</h3>
                    {!notification.isRead && <Badge className="bg-primary text-white">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{formatShortDate(notification.createdAt)}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
