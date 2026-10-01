import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

interface AccountRequest {
    _id: string;
    name: string;
    email: string;
    department?: {
        name: string;
    };
    createdAt: string;
}

export default function AccountRequests() {
    const [requests, setRequests] = useState<AccountRequest[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUnverifiedUsers();
    }, []);

    // 🔹 Fetch unverified users (same pattern as fetchSubAdmins)
    const fetchUnverifiedUsers = async () => {
        try {
            setLoading(true);
            const response = await apiClient.fetchUnverifiedUsers();
            setRequests(response.data || []);
        } catch (error) {
            console.error("Failed to fetch unverified users:", error);
            toast.error("Failed to load account requests");
        } finally {
            setLoading(false);
        }
    };

    // 🔹 Approve / Verify user
    const handleApprove = async (userId: string) => {
        try {
            await apiClient.verifyUser(userId);
            toast.success("User verified successfully");

            setRequests((prev) => prev.filter((u) => u._id !== userId));
        } catch (error) {
            console.error("Failed to verify user:", error);
            toast.error("Failed to verify user");
        }
    };
    
    const handleDelete = async (userId: string) => {
        try {
            await apiClient.deleteUser(userId);
            toast.success("Request Processed successfully");
            
            setRequests((prev) => prev.filter((u) => u._id !== userId));

        } catch (error) {
            console.error("Failed to process :", error);
            toast.error("Failed to process");
        }
    }


    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">
                    Account Requests
                </h2>
                <p className="text-muted-foreground">
                    Review and approve pending user registrations
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                    <CardDescription>
                        {requests.length} request
                        {requests.length !== 1 ? "s" : ""} awaiting approval
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-muted-foreground">
                            Loading requests...
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            No pending requests
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Requested Date</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {requests.map((user) => (
                                    <TableRow key={user._id}>
                                        <TableCell className="font-medium">
                                            {user.name}
                                        </TableCell>

                                        <TableCell>{user.email}</TableCell>

                                        <TableCell>
                                            <Badge variant="outline">
                                                {user.department?.name ?? "N/A"}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        handleApprove(user._id)
                                                    }
                                                    className="gap-1"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                    Approve
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        handleDelete(user._id)
                                                    }
                                                    className="gap-1"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                    Reject
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
