import { Grid, Paper } from "@mui/material";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const pieData = [
  { name: "Invoiced", value: 1248487 },
  { name: "Collected", value: 268586 },
  { name: "Outstanding", value: 14480 },
];
const barData = [
  { name: "Jan", income: 4000, expenses: 2400 },
  { name: "Feb", income: 3000, expenses: 1398 },
  { name: "Mar", income: 2000, expenses: 9800 },
  { name: "Apr", income: 2780, expenses: 3908 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

export default function Charts() {
  return (
    <Grid container spacing={2} mt={2}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <h3>Invoice Status</h3>
          <PieChart width={300} height={250}>
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100}>
              {pieData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <h3>Income & Expenses</h3>
          <BarChart width={400} height={250} data={barData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="income" fill="#82ca9d" />
            <Bar dataKey="expenses" fill="#8884d8" />
          </BarChart>
        </Paper>
      </Grid>
    </Grid>
  );
}
