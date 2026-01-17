
import React from "react";
import { 
  Home, Users, UserPlus, FileText, 
  Upload, Settings as SettingsIcon, Percent
} from "lucide-react"; 

export default function Sidebar({ setPage, page }) {
  const menuItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "employees", icon: Users, label: "Employees" },
    { id: "addEmployee", icon: UserPlus, label: "Add Employee" },
    { id: "payslips", icon: FileText, label: "Generate Payslips" },
    { id: "upload", icon: Upload, label: "Upload CSV", subLabel: "Bulk update" },
    { id: "settings", icon: SettingsIcon, label: "Settings", subLabel: "Bulk update" },
    { id: "epf-ecr", icon: Percent, label: "EPF/ECR", subLabel: "PF Management" }
  ];

  return (
    <aside className="sidebar">
      <div className="logo-section">
        <div className="logo">
          <div className="logo-icon">₹</div>
          <div>
            <h2>Payroll Pro</h2>
            <p className="logo-subtitle">Simple Payroll System</p>
          </div>
        </div>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${page === item.id ? "active" : ""}`}
            onClick={() => window.location.hash = item.id}
          >
            <item.icon size={20} />
            <div className="nav-labels">
              <span className="nav-label">{item.label}</span>
              {item.subLabel && <small className="nav-sub">{item.subLabel}</small>}
            </div>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="version-info">
          <small>Version 2.0.0</small>
        </div>
      </div>
    </aside>
  );
}
