import { useMemo } from "react";
import { Alert, Paper, useMediaQuery, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

/**
 * DataGrid with server pagination and phone-friendly defaults.
 * - mobileHidden: fields hidden on small screens (users can still scroll horizontally for the rest)
 * - table: the object returned by useServerTable
 */
export default function DataTable({ table, columns, mobileHidden = [], onRowClick, height, pageSizeOptions = [10, 25, 50, 100], ...rest }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const visibility = useMemo(
    () => (isMobile ? Object.fromEntries(mobileHidden.map((f) => [f, false])) : {}),
    [isMobile, mobileHidden]
  );
  const options = pageSizeOptions.includes(table.paginationModel.pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, table.paginationModel.pageSize].sort((a, b) => a - b);

  return (
    <>
      {table.error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<span style={{ cursor: "pointer" }} onClick={table.reload}>Retry</span>}>
          {table.error}
        </Alert>
      )}
      <Paper sx={{ height: height || { xs: "calc(100vh - 230px)", sm: 560 }, minHeight: 380, width: "100%", overflow: "hidden" }}>
        <DataGrid
          rows={table.rows}
          columns={columns}
          rowCount={table.total}
          loading={table.loading}
          paginationMode="server"
          paginationModel={table.paginationModel}
          onPaginationModelChange={table.setPaginationModel}
          pageSizeOptions={options}
          columnVisibilityModel={visibility}
          disableRowSelectionOnClick
          disableColumnMenu={isMobile}
          density={isMobile ? "compact" : "standard"}
          onRowClick={onRowClick}
          localeText={{ noRowsLabel: "No records found" }}
          sx={{
            border: 0,
            "& .MuiDataGrid-row": onRowClick ? { cursor: "pointer" } : undefined,
            "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8fafc" },
            "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700 },
          }}
          {...rest}
        />
      </Paper>
    </>
  );
}
