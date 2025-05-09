import apiClient, { getMockTestUser } from "./api";

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  userType: "patient" | "nurse" | "admin";
  name?: string;
  phone?: string;
  nationalId?: string;
  isActive?: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  userType: "patient" | "nurse" | "admin";
  name?: string;
  phone?: string;
  address?: string;
  profileComplete: boolean;
  isActive: boolean;
  nationalId?: string;
  activationDate?: string;
  registrationDate: string;
  balance?: number; // For nurse earnings
  totalEarned?: number;
}

export const authService = {
  login: async (data: LoginRequest) => {
    try {
      console.log("Login attempt with:", data.email);
      const response = await apiClient.post("/auth/login", data);
      
      if (response.data.token) {
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("user_type", response.data.userType);
        localStorage.setItem("user_data", JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  register: async (data: RegisterRequest) => {
    try {
      console.log("Registration attempt for:", data.email, "as", data.userType);
      const response = await apiClient.post("/auth/register", data);
      
      if (response.data.token) {
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("user_type", data.userType);
        localStorage.setItem("user_data", JSON.stringify(response.data.user));
        
        // Create profile immediately after registration with name and phone
        try {
          await authService.createProfile({
            email: data.email,
            userType: data.userType,
            name: data.name,
            phone: data.phone,
            nationalId: data.nationalId,
            isActive: data.isActive || false,
            profileComplete: false,
            registrationDate: new Date().toISOString()
          });
        } catch (profileError) {
          console.error("Error creating initial profile:", profileError);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },
  
  createProfile: async (profileData: Partial<UserProfile>) => {
    try {
      console.log("Creating profile:", profileData);
      const response = await apiClient.post("/user/profile", profileData);
      
      // Update stored user data
      if (response.data) {
        const currentUserData = JSON.parse(localStorage.getItem("user_data") || "{}");
        localStorage.setItem("user_data", JSON.stringify({
          ...currentUserData,
          ...response.data
        }));
      }
      
      return response.data;
    } catch (error) {
      console.error("Create profile error:", error);
      throw error;
    }
  },
  
  updateProfile: async (profileData: Partial<UserProfile>) => {
    try {
      console.log("Updating profile:", profileData);
      const response = await apiClient.put("/user/profile", profileData);
      
      // Update stored user data
      if (response.data) {
        const currentUserData = JSON.parse(localStorage.getItem("user_data") || "{}");
        localStorage.setItem("user_data", JSON.stringify({
          ...currentUserData,
          ...response.data
        }));
      }
      
      return response.data;
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  },
  
  getProfile: async () => {
    try {
      console.log("Fetching profile");
      const response = await apiClient.get("/user/profile");
      
      // Update stored user data
      if (response.data) {
        localStorage.setItem("user_data", JSON.stringify(response.data));
      }
      
      return response.data;
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_type");
    localStorage.removeItem("user_data");
    window.location.href = "/";
  },

  getCurrentUser: () => {
    const userData = localStorage.getItem("user_data");
    return userData ? JSON.parse(userData) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("auth_token");
  },
  
  // Helper to get test credentials
  getTestCredentials: () => {
    return getMockTestUser();
  },
  
  // Methods for admin functionality
  getAllUsers: async () => {
    try {
      const response = await apiClient.get("/admin/users");
      return response.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },
  
  activateUser: async (userId: string) => {
    try {
      const response = await apiClient.put(`/admin/users/${userId}/activate`);
      return response.data;
    } catch (error) {
      console.error("Error activating user:", error);
      throw error;
    }
  },
  
  deactivateUser: async (userId: string) => {
    try {
      const response = await apiClient.put(`/admin/users/${userId}/deactivate`);
      return response.data;
    } catch (error) {
      console.error("Error deactivating user:", error);
      throw error;
    }
  },
  
  deleteUser: async (userId: string) => {
    try {
      const response = await apiClient.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }
};
