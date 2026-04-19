import { useState } from "react";
import { Bell, CheckCircle, Clock, Eye } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useApiData } from "../../hooks/useApiData";
import { apiRequest } from "@/src/lib/api";
import { formatShortDate } from "@/src/lib/presentation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationStats = {
  total: number;
  unread: number;
  read: number;
};

export default function PublicNotifications() {
  const user = useCurrentUser();
  const [activeTab, setActiveTab] = useState("all");
  const { data, error, loading, refetch } = useApiData(
    async () => {
      const [notifications, stats] = await Promise.all([
        apiRequest<NotificationRecord[]>("/notifications", {
          query: { limit: 50 },
        }),
        apiRequest<NotificationStats>("/notifications/stats"),
      ]);

      return { notifications, stats };
    },
    [user?.id]
  );

  const markNotificationAsRead = async (notificationId: string) => {
    await apiRequest(`/notifications/${notificationId}/read`, {
      method: "PATCH",
    });

    refetch();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading notifications..." />
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

  const filteredNotifications = data.notifications.filter((notification) => {
    if (activeTab === "read") {
      return notification.isRead;
    }

    if (activeTab === "unread") {
      return !notification.isRead;
    }

    return true;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-muted-foreground">
          Stay updated with complaint progress and citizen account activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="mt-2 text-2xl font-bold">{data.stats.total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Unread</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{data.stats.unread}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Read</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{data.stats.read}</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No notifications in this view right now.
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-6 ${!notification.isRead ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-lg bg-primary/10 p-2">
                    {!notification.isRead ? (
                      <Bell className="size-5 text-primary" />
                    ) : (
                      <CheckCircle className="size-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1 gap-3">
                      <h3 className="font-semibold">{notification.title}</h3>
                      {!notification.isRead && (
                        <Badge className="bg-primary text-white">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {formatShortDate(notification.createdAt)}
                      </span>
                      <Badge variant="outline">{notification.type.toUpperCase()}</Badge>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void markNotificationAsRead(notification.id)}
                    >
                      <Eye className="size-4 mr-2" />
                      Mark as Read
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
