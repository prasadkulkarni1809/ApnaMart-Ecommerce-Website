import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AdminLayout from "../../admin/layout/AdminLayout.jsx";

function Layout({ children }) {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) {
    return <AdminLayout>{children}</AdminLayout>;
  }
  if (location.pathname.startsWith("/seller")) return children;

  return (
    <div className="min-h-screen flex flex-col">
      
      <Navbar />

      <main className="flex-1">
        {children}
      </main>

      <Footer />

    </div>
  );
}

export default Layout;
