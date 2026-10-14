import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import useCatalog from "../../hooks/useCatalog";
import useDebounce from "../../hooks/useDebounce";
import { RecipeServices } from "../../services/V4Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency } from "../../utils/format";
import RecipeDialog from "./RecipeDialog";

/** Items made from a recipe, with their real cost and profit. */
export default function Recipes() {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const [storeId, setStoreId] = useStoreId();
  const catalog = useCatalog(storeId);
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);
  const [dialog, setDialog] = useState(null);

  const load = useCallback(() => {
    RecipeServices.list({ store_id: storeId, search: q })
      .then((r) => setRows(r.data))
      .catch((e) => notify(apiError(e), "error"));
  }, [storeId, q, notify]);
  useEffect(() => {
    if (storeId) load();
  }, [load, storeId]);

  return (
    <>
      <PageHeader
        title="Recipes & real cost"
        subtitle="Selling an item takes its ingredients out of stock and shows the true profit"
        actions={
          <>
            <StorePicker value={storeId} onChange={setStoreId} />
            {can("products", "edit") && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ product: null })}>
                {t("New recipe")}
              </Button>
            )}
          </>
        }
      />
      <Toolbar>
        <SearchField value={search} onChange={setSearch} placeholder={t("Search item")} />
      </Toolbar>
      {rows && rows.length === 0 && (
        <Alert severity="info">{t("No recipes yet. Example: Brownie Sundae = 0.2 L milk + 1 cone + 50 g chocolate topping. Add the raw materials as products first (mark them as raw material).")}</Alert>
      )}
      {rows && rows.length > 0 && (
        <Paper sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("Item")}</TableCell>
                <TableCell align="right">{t("Ingredients")}</TableCell>
                <TableCell align="right">{t("Cost to make")}</TableCell>
                <TableCell align="right">{t("Price (before GST)")}</TableCell>
                <TableCell align="right">{t("Profit")}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.product_id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {r.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.category} {r.status !== "Active" && <Chip size="small" label={t(r.status)} />}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{r.ingredients}</TableCell>
                  <TableCell align="right">{formatCurrency(r.recipe_cost)}</TableCell>
                  <TableCell align="right">{formatCurrency(r.price_before_tax)}</TableCell>
                  <TableCell align="right">
                    <Box component="span" sx={{ fontWeight: 700, color: r.profit >= 0 ? "success.main" : "error.main" }}>
                      {formatCurrency(r.profit)}
                    </Box>{" "}
                    {r.margin_percent !== null && <Chip size="small" label={`${r.margin_percent}%`} color={r.margin_percent >= 50 ? "success" : r.margin_percent >= 25 ? "warning" : "error"} />}
                  </TableCell>
                  <TableCell align="right">
                    {can("products", "edit") && (
                      <Tooltip title={t("Edit recipe")}>
                        <IconButton size="small" color="primary" onClick={() => setDialog({ product: catalog.products.find((p) => p.product_id === r.product_id) || r })}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      {dialog && (
        <RecipeDialog
          product={dialog.product}
          products={catalog.products}
          onClose={() => setDialog(null)}
          onSaved={(res) => {
            setDialog(null);
            notify(t(res.message));
            load();
          }}
        />
      )}
    </>
  );
}
