import mongoose from "mongoose";

const ErrorLogSchema = new mongoose.Schema({
  user: { type: String },
  station: { type: String },
  errorType: { type: String },
  message: { type: String },
  stack: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.ErrorLog || mongoose.model("ErrorLog", ErrorLogSchema);
