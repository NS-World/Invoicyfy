import { Grid, Paper, Typography } from "@mui/material";

const cards = [
  { title: "Total Sales", value: "$24,05,278" },
  { title: "Total Outstanding", value: "$4,648" },
  { title: "Total Overdue", value: "$768" },
  { title: "Total Clients", value: "421" },
];

export default function DashboardCards() {
  return (
    <Grid container spacing={2}>
      {cards.map((c) => (
        <Grid item xs={12} sm={6} md={3} key={c.title}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h6">{c.title}</Typography>
            <Typography variant="h5" fontWeight="bold">{c.value}</Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
