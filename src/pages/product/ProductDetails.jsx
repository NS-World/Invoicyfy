import { useEffect, useState } from "react";
import { Alert, Box, Button, Grid, Paper, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import StatCard from "../../components/common/StatCard";
import StatusChip from "../../components/common/StatusChip";
import StockHistoryDialog from "../inventory/StockHistoryDialog";
import { ProductServices } from "../../services/ProductServices";
import { apiError, formatCurrency, formatNumber } from "../../utils/format";

const Row = ({ label, value }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderBottom: "1px solid", borderColor: "divider", gap: 2 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>
      {value || "—"}
    </Typography>
  </Box>
);

export default function ProductDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const id = params.get("id") || location.state?.productData?.product_id;
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    ProductServices.getProductDataFromId(id)
      .then((r) => setProduct(r.data))
      .catch((e) => setError(apiError(e)));
  }, [id]);

  if (!id) return <Navigate to="/products" replace />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!product) return <Loader />;

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={[product.sku, product.category].filter(Boolean).join(" · ")}
        back="/products"
        actions={
          <>
            {Boolean(product.track_inventory) && (
              <Button variant="outlined" onClick={() => setHistoryOpen(true)}>
                Stock history
              </Button>
            )}
            <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/product?id=${product.product_id}`)}>
              Edit
            </Button>
          </>
        }
      />
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Selling price" value={formatCurrency(product.price)} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="In stock" value={product.track_inventory ? `${formatNumber(product.stock_qty, 3)} ${product.unit}` : "Not tracked"} color={product.track_inventory && product.stock_qty <= product.low_stock_threshold ? "error.main" : "primary.main"} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Total sold" value={`${formatNumber(product.sales?.qty_sold, 3)} ${product.unit}`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Revenue" value={formatCurrency(product.sales?.revenue)} color="success.main" />
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, maxWidth: 700 }}>
        <Row label="Status" value={<StatusChip status={product.status} />} />
        <Row label="HSN / SAC" value={product.hsn_code} />
        <Row label="GST rate" value={`${formatNumber(product.gst_rate)}% ${product.price_includes_tax ? "(included in price)" : "(added on top)"}`} />
        <Row label="Cost price" value={formatCurrency(product.cost_price)} />
        <Row label="Unit" value={product.unit} />
        <Row label="Low stock alert at" value={formatNumber(product.low_stock_threshold, 3)} />
        <Row label="Store" value={product.store_name} />
        <Row label="Description" value={product.description} />
      </Paper>
      <StockHistoryDialog product={product} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
