import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "frontend/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "frontend/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "frontend/src/components/ui/table";
import { Badge } from "frontend/src/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "frontend/src/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "frontend/src/components/ui/pagination";
import {
  LogOut,
  Package,
  User,
  MapPin,
  Phone,
  Calendar,
  Trash2,
  Mail,
  Truck,
} from "lucide-react";
import { useAuth } from "frontend/src/contexts/AuthContext";
import { useToast } from "frontend/src/hooks/use-toast";

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(5);
  const navigate = useNavigate();
  const { isAdminAuthenticated, logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/admin/login");
      return;
    }

    // Load orders from localStorage
    const savedOrders = localStorage.getItem("orders");
    if (savedOrders) {
      const parsedOrders = JSON.parse(savedOrders);
      // Add default status if missing
      const ordersWithStatus = parsedOrders.map((order) => ({
        ...order,
        status: order.status || "pending",
      }));
      setOrders(ordersWithStatus);
    }
  }, [isAdminAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const handleDeleteOrder = (orderId) => {
    const updatedOrders = orders.filter((order) => order.id !== orderId);
    setOrders(updatedOrders);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    toast({
      title: "Commande supprimée",
      description: "La commande a été supprimée avec succès.",
    });
  };

  const handleStatusChange = (orderId, newStatus) => {
    const updatedOrders = orders.map((order) =>
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    toast({
      title: "Statut mis à jour",
      description: `Le statut de la commande a été changé à ${getStatusLabel(
        newStatus
      )}.`,
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "delivered":
        return "Livrée";
      case "canceled":
        return "Annulée";
      default:
        return "En attente";
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "delivered":
        return "default";
      case "canceled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Pagination logic
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  console.log("current orders", currentOrders);
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (!isAdminAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-gradient-card shadow-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold bg-primary bg-clip-text text-transparent">
              Tableau de Bord Administrateur
            </h1>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Totale Commandes
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Totale Revenu
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}{" "}
                DA
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Moyenne Commande
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.length > 0
                  ? (
                      orders.reduce((sum, order) => sum + order.total, 0) /
                      orders.length
                    ).toFixed(2)
                  : "0.00"}{" "}
                DA
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle>Commandes Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucune commande pour le moment
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commande ID</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Wilaya</TableHead>
                      <TableHead>Livraison</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Totale</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <div>
                            <Badge variant="outline">
                              #{order.orderNumber || order.id.slice(-6)}
                            </Badge>
                            {order.orderNumber && (
                              <div className="text-xs text-muted-foreground mt-1">
                                ID: {order.id.slice(-6)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {order.productName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.productPrice} DA
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {order.customerName}
                              </div>
                              {order.email && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {order.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {order.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {order.wilaya}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {order.deliveryPrice} DA
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{order.quantity}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div>{order.total.toFixed(2)} DA</div>
                            {order.subtotal && (
                              <div className="text-xs text-muted-foreground">
                                Sous-total: {order.subtotal.toFixed(2)} DA
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(value) =>
                              handleStatusChange(order.id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <Badge
                                  variant={getStatusBadgeVariant("pending")}
                                >
                                  En attente
                                </Badge>
                              </SelectItem>
                              <SelectItem value="delivered">
                                <Badge
                                  variant={getStatusBadgeVariant("delivered")}
                                >
                                  Livrée
                                </Badge>
                              </SelectItem>
                              <SelectItem value="canceled">
                                <Badge
                                  variant={getStatusBadgeVariant("canceled")}
                                >
                                  Annulée
                                </Badge>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDate(order.timestamp)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="h-8 w-8 p-0"
                            title="Supprimer la commande"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {orders.length > ordersPerPage && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          handlePageChange(Math.max(1, currentPage - 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          handlePageChange(
                            Math.min(totalPages, currentPage + 1)
                          )
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        {currentOrders.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Détails Commande</h2>
            <div className="grid gap-4">
              {currentOrders.map((order) => (
                <Card
                  key={order.id}
                  className="bg-gradient-card shadow-card border-0"
                >
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <h3 className="font-semibold text-primary mb-3">
                          Commande #{order.orderNumber || order.id.slice(-6)}
                        </h3>
                        <div className="space-y-2">
                          <p>
                            <strong>Produit:</strong> {order.productName}
                          </p>
                          <p>
                            <strong>Prix unitaire:</strong> {order.productPrice}{" "}
                            DA
                          </p>
                          <p>
                            <strong>Quantité:</strong> {order.quantity}
                          </p>
                          {order.subtotal && (
                            <p>
                              <strong>Sous-total:</strong>{" "}
                              {order.subtotal.toFixed(2)} DA
                            </p>
                          )}
                          {order.deliveryPrice && (
                            <p>
                              <strong>Frais de livraison:</strong>{" "}
                              {order.deliveryPrice} DA
                            </p>
                          )}
                          <p className="text-lg">
                            <strong>Total:</strong> {order.total.toFixed(2)} DA
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary mb-3">
                          Informations Client
                        </h4>
                        <div className="space-y-2">
                          <p>
                            <strong>Nom complet:</strong> {order.customerName}
                          </p>
                          {order.email && (
                            <p>
                              <strong>Email:</strong> {order.email}
                            </p>
                          )}
                          <p>
                            <strong>Téléphone:</strong> {order.phone}
                          </p>
                          {order.wilaya && (
                            <p>
                              <strong>Wilaya:</strong> {order.wilaya}
                            </p>
                          )}
                          <div>
                            <strong>Adresse de livraison:</strong>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                              {order.address}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary mb-3">
                          Informations Supplémentaires
                        </h4>
                        <div className="space-y-2">
                          <p>
                            <strong>Statut:</strong>
                            <Badge
                              variant={getStatusBadgeVariant(order.status)}
                              className="ml-2"
                            >
                              {getStatusLabel(order.status)}
                            </Badge>
                          </p>
                          <p>
                            <strong>Date de commande:</strong>{" "}
                            {formatDate(order.timestamp)}
                          </p>
                          {order.notes && (
                            <div>
                              <strong>Notes du client:</strong>
                              <p className="text-sm text-muted-foreground mt-1 p-3 bg-accent/20 rounded-lg leading-relaxed">
                                {order.notes}
                              </p>
                            </div>
                          )}
                          {!order.notes && (
                            <p className="text-sm text-muted-foreground italic">
                              Aucune note spéciale
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
