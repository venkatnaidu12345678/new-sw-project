import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import FeaturesPage from "./pages/FeaturesPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import DriversPage from "./pages/DriversPage";
import DownloadPage from "./pages/DownloadPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ErrorPage from "./pages/ErrorPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "features", element: <FeaturesPage /> },
      { path: "how-it-works", element: <HowItWorksPage /> },
      { path: "drivers", element: <DriversPage /> },
      { path: "download", element: <DownloadPage /> },
      { path: "privacy", element: <PrivacyPolicyPage /> },
      { path: "privacy-policy", element: <PrivacyPolicyPage /> },
    ],
  },
]);
