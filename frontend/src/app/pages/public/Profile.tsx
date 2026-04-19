import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { User, Mail, Phone, MapPin, Calendar, Shield } from "lucide-react";
import { Badge } from "../../components/ui/badge";

export default function PublicProfile() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <Card className="p-6 text-center">
            <div className="bg-primary/10 size-24 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="size-12 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-1">John Doe</h2>
            <p className="text-sm text-muted-foreground mb-4">Citizen ID: CIT-2024-5678</p>
            <Badge className="bg-accent text-white">Verified Citizen</Badge>
            <div className="mt-6 text-left space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Joined March 2024</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">12 Complaints Filed</span>
              </div>
            </div>
          </Card>

          {/* Profile Details Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">
                    <Mail className="size-4 inline mr-2" />
                    Email
                  </Label>
                  <Input id="email" type="email" defaultValue="john.doe@example.com" />
                </div>
                <div>
                  <Label htmlFor="phone">
                    <Phone className="size-4 inline mr-2" />
                    Phone Number
                  </Label>
                  <Input id="phone" defaultValue="+91 98765 43210" />
                </div>
                <div>
                  <Label htmlFor="address">
                    <MapPin className="size-4 inline mr-2" />
                    Address
                  </Label>
                  <Input id="address" defaultValue="123, Main Street, Mumbai - 400001" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Security</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" placeholder="••••••••" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="size-4" />
                  <span className="text-sm">Email notifications for complaint updates</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="size-4" />
                  <span className="text-sm">SMS notifications for urgent updates</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="size-4" />
                  <span className="text-sm">Push notifications</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="size-4" />
                  <span className="text-sm">Weekly summary emails</span>
                </label>
              </div>
            </Card>

            <div className="flex gap-4">
              <Button className="flex-1">Save Changes</Button>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
