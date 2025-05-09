
import axios from "axios";

// Create an API client instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable sending cookies with requests
});

// Add request interceptor to include auth token in requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock responses for development without backend
const useMockResponses = !import.meta.env.VITE_API_URL && import.meta.env.DEV;

// Define interfaces for our mock database types
interface BaseUser {
  id: string;
  email: string;
  password: string;
  userType: string;
  name: string;
  phone: string;
  address: string;
  profileComplete: boolean;
  profileImage: string;
  isActive: boolean;
  registrationDate: string;
  activationDate?: string;
  nationalId?: string;
}

interface PatientUser extends BaseUser {
  userType: "patient";
  dateOfBirth: string;
  gender: string;
  emergencyContact: string;
  bloodType: string;
  medicalConditions: string[];
  allergies: string[];
}

interface NurseUser extends BaseUser {
  userType: "nurse";
  licenseId: string;
  specializations: string[];
  experience: string;
  availabilityStatus: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
  balance: number;
  totalEarned: number;
}

interface AdminUser extends BaseUser {
  userType: "admin";
}

type User = PatientUser | NurseUser | AdminUser;

interface ServiceRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: string;
  serviceType: string;
  details: string;
  address: string;
  status: string;
  createdAt: string;
  assignedNurse: string | null;
  broadcastToAllNurses: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  cost?: number;
  isPaid?: boolean;
  emergency?: boolean;
}

interface MedicalQuestion {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  description: string;
  createdAt: string;
  status: "open" | "assigned" | "answered";
  assignedTo?: string;
  assignedToName?: string;
  answer?: string;
  answeredAt?: string;
}

interface MockDatabase {
  users: User[];
  serviceRequests: ServiceRequest[];
  medicalQuestions: MedicalQuestion[];
}

// Store mock data for persistence across requests
const mockDb: MockDatabase = {
  users: [
    {
      id: "test123",
      email: "test@example.com",
      password: "password123",
      userType: "patient",
      name: "Test User",
      phone: "+201234567890",
      dateOfBirth: "1990-01-01",
      gender: "female",
      address: "123 Test Street, Test City",
      emergencyContact: "+201234567891",
      bloodType: "A+",
      medicalConditions: ["Asthma"],
      allergies: ["Pollen"],
      profileComplete: true,
      profileImage: "https://i.pravatar.cc/300?u=test@example.com",
      isActive: true,
      registrationDate: "2024-01-15T12:30:45Z",
      activationDate: "2024-01-15T14:22:33Z",
      nationalId: "12345678901234"
    },
    {
      id: "nurse123",
      email: "nurse@example.com",
      password: "password123",
      userType: "nurse",
      name: "Nurse Test",
      phone: "+201234567891",
      address: "456 Nurse Street, Test City",
      profileComplete: true,
      profileImage: "https://i.pravatar.cc/300?u=nurse@example.com",
      licenseId: "NUR12345",
      specializations: ["General care", "Injections"],
      experience: "5 years",
      availabilityStatus: false,
      location: {
        latitude: 30.0444,
        longitude: 31.2357
      },
      isActive: true,
      registrationDate: "2024-01-10T08:15:30Z",
      activationDate: "2024-01-10T10:22:15Z",
      balance: 1500,
      totalEarned: 5000
    },
    {
      id: "admin123",
      email: "admin@example.com",
      password: "admin123",
      userType: "admin",
      name: "System Admin",
      phone: "+201234567899",
      address: "789 Admin Street, Admin City",
      profileComplete: true,
      profileImage: "https://i.pravatar.cc/300?u=admin@example.com",
      isActive: true,
      registrationDate: "2023-12-01T09:00:00Z",
      activationDate: "2023-12-01T09:00:00Z"
    },
    {
      id: "default_admin",
      email: "admin.auth",
      password: "Qwer112233",
      userType: "admin",
      name: "Default Administrator",
      phone: "+201234567888",
      address: "Admin Headquarters",
      profileComplete: true,
      profileImage: "https://i.pravatar.cc/300?u=admin.auth",
      isActive: true,
      registrationDate: "2023-01-01T00:00:00Z",
      activationDate: "2023-01-01T00:00:00Z"
    }
  ],
  serviceRequests: [
    {
      id: "req_001",
      patientId: "test123",
      patientName: "Test User",
      patientAge: "35",
      serviceType: "prescribed",
      details: "Daily insulin injection required",
      address: "123 Test Street, Test City",
      status: "pending",
      createdAt: new Date().toISOString(),
      assignedNurse: null,
      broadcastToAllNurses: true,
      coordinates: {
        latitude: 30.0444,
        longitude: 31.2357
      },
      cost: 150,
      isPaid: false,
      emergency: false
    }
  ],
  medicalQuestions: [
    {
      id: "q_001",
      patientId: "test123",
      patientName: "Test User",
      title: "Recurring headache question",
      description: "I've been experiencing recurring headaches for the past week. What could be causing this?",
      createdAt: new Date().toISOString(),
      status: "open"
    }
  ]
};

// Add response interceptor for error handling and mock responses
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If we're using mock responses and there's no response, mock it
    if (useMockResponses && !error.response) {
      console.log("Using mock response for:", error.config.url, error.config.method);
      return handleMockResponse(error.config);
    }

    // Handle common errors (401, 403, etc.)
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem("auth_token");
      window.location.href = "/patient/login";
    }
    
    // Log detailed error information for debugging
    console.error("API Error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      endpoint: error.config?.url,
      method: error.config?.method,
    });
    
    return Promise.reject(error);
  }
);

// Helper function to handle mock responses
async function handleMockResponse(config) {
  // Wait a bit to simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const url = config.url;
  const method = config.method.toUpperCase();
  
  // Auth endpoints
  if (url.includes("/auth/login") && method === "POST") {
    const body = JSON.parse(config.data);
    const user = mockDb.users.find(u => u.email === body.email && u.password === body.password);
    
    if (user) {
      // Check if account is active
      if (!user.isActive) {
        return Promise.reject({
          response: {
            status: 403,
            data: { message: "Account is pending activation by an administrator." }
          }
        });
      }
      
      return {
        data: {
          token: "mock_token_" + Date.now(),
          user: { ...user, password: undefined },
          userType: user.userType
        }
      };
    } else {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Invalid credentials" }
        }
      });
    }
  }
  
  if (url.includes("/auth/register") && method === "POST") {
    const body = JSON.parse(config.data);
    
    // Check if user already exists
    if (mockDb.users.some(u => u.email === body.email)) {
      return Promise.reject({
        response: {
          status: 409,
          data: { message: "User with this email already exists" }
        }
      });
    }
    
    const currentDate = new Date().toISOString();
    
    // Create new user based on user type
    if (body.userType === "patient") {
      const newPatient: PatientUser = {
        id: "user_" + Date.now(),
        email: body.email,
        password: body.password,
        userType: "patient",
        name: body.name || "",
        phone: body.phone || "",
        address: "",
        dateOfBirth: "",
        gender: "",
        emergencyContact: "",
        bloodType: "",
        medicalConditions: [],
        allergies: [],
        profileComplete: false,
        profileImage: `https://i.pravatar.cc/300?u=${body.email}`,
        isActive: body.isActive || false,
        registrationDate: currentDate,
        nationalId: body.nationalId || ""
      };
      
      mockDb.users.push(newPatient);
      
      return {
        data: {
          token: "mock_token_" + Date.now(),
          user: { ...newPatient, password: undefined },
          userType: newPatient.userType
        }
      };
    } else if (body.userType === "nurse") {
      const newNurse: NurseUser = {
        id: "user_" + Date.now(),
        email: body.email,
        password: body.password,
        userType: "nurse",
        name: body.name || "",
        phone: body.phone || "",
        address: "",
        licenseId: "",
        specializations: [],
        experience: "",
        availabilityStatus: false,
        location: {
          latitude: 0,
          longitude: 0
        },
        profileComplete: false,
        profileImage: `https://i.pravatar.cc/300?u=${body.email}`,
        isActive: body.isActive || false,
        registrationDate: currentDate,
        balance: 0,
        totalEarned: 0
      };
      
      mockDb.users.push(newNurse);
      
      return {
        data: {
          token: "mock_token_" + Date.now(),
          user: { ...newNurse, password: undefined },
          userType: newNurse.userType
        }
      };
    } else if (body.userType === "admin") {
      // Admins are always created active
      const newAdmin: AdminUser = {
        id: "admin_" + Date.now(),
        email: body.email,
        password: body.password,
        userType: "admin",
        name: body.name || "",
        phone: body.phone || "",
        address: "",
        profileComplete: true,
        profileImage: `https://i.pravatar.cc/300?u=${body.email}`,
        isActive: true,
        registrationDate: currentDate,
        activationDate: currentDate
      };
      
      mockDb.users.push(newAdmin);
      
      return {
        data: {
          token: "mock_token_" + Date.now(),
          user: { ...newAdmin, password: undefined },
          userType: newAdmin.userType
        }
      };
    }
    
    return Promise.reject({
      response: {
        status: 400,
        data: { message: "Invalid user type" }
      }
    });
  }
  
  // User profile endpoints
  if (url.includes("/user/profile") && method === "GET") {
    const token = config.headers.Authorization?.split(" ")[1];
    if (!token) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Unauthorized" }
        }
      });
    }
    
    const userType = localStorage.getItem("user_type");
    const user = mockDb.users.find(u => u.userType === userType);
    
    if (user) {
      return {
        data: { ...user, password: undefined }
      };
    } else {
      return Promise.reject({
        response: {
          status: 404,
          data: { message: "User not found" }
        }
      });
    }
  }
  
  if (url.includes("/user/profile") && method === "POST") {
    const token = config.headers.Authorization?.split(" ")[1];
    const body = JSON.parse(config.data);
    
    if (!token) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Unauthorized" }
        }
      });
    }
    
    const userType = localStorage.getItem("user_type");
    const userIndex = mockDb.users.findIndex(u => u.userType === userType);
    
    if (userIndex !== -1) {
      mockDb.users[userIndex] = {
        ...mockDb.users[userIndex],
        ...body
      };
      
      return {
        data: { ...mockDb.users[userIndex], password: undefined }
      };
    } else {
      return Promise.reject({
        response: {
          status: 404,
          data: { message: "User not found" }
        }
      });
    }
  }
  
  if (url.includes("/user/complete-profile") && method === "PUT") {
    const token = config.headers.Authorization?.split(" ")[1];
    const body = JSON.parse(config.data);
    
    if (!token) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Unauthorized" }
        }
      });
    }
    
    // Find the user and update profile
    const userType = localStorage.getItem("user_type");
    const userIndex = mockDb.users.findIndex(u => u.userType === userType);
    
    if (userIndex !== -1) {
      mockDb.users[userIndex] = {
        ...mockDb.users[userIndex],
        ...body,
        profileComplete: true
      };
      
      return {
        data: { ...mockDb.users[userIndex], password: undefined }
      };
    } else {
      return Promise.reject({
        response: {
          status: 404,
          data: { message: "User not found" }
        }
      });
    }
  }
  
  if (url.includes("/user/upload-profile-image") && method === "POST") {
    // Mock image upload
    return {
      data: {
        imageUrl: "https://i.pravatar.cc/300?u=" + Date.now()
      }
    };
  }

  // Patient service request endpoints
  if (url.includes("/patient/request-service") && method === "POST") {
    const token = config.headers.Authorization?.split(" ")[1];
    const body = JSON.parse(config.data);
    
    if (!token) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Unauthorized" }
        }
      });
    }
    
    // Create new service request
    const userType = localStorage.getItem("user_type");
    const user = mockDb.users.find(u => u.userType === userType);
    
    if (!user) {
      return Promise.reject({
        response: {
          status: 404,
          data: { message: "User not found" }
        }
      });
    }
    
    const newRequest: ServiceRequest = {
      id: "req_" + Date.now(),
      patientId: user.id,
      patientName: body.patientName,
      patientAge: body.patientAge,
      serviceType: body.serviceType,
      details: body.details,
      address: body.address,
      coordinates: body.coordinates || null,
      status: "pending",
      createdAt: new Date().toISOString(),
      assignedNurse: null,
      broadcastToAllNurses: body.broadcastToAllNurses || false,
      emergency: body.emergency || false,
      cost: Math.floor(Math.random() * 300) + 100 // Random cost between 100-400
    };
    
    mockDb.serviceRequests.push(newRequest);
    
    return {
      data: newRequest
    };
  }

  // Nurse endpoints
  if (url.includes("/nurse/availability") && method === "POST") {
    const token = config.headers.Authorization?.split(" ")[1];
    const body = JSON.parse(config.data);
    
    if (!token) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Unauthorized" }
        }
      });
    }
    
    const userType = localStorage.getItem("user_type");
    const userIndex = mockDb.users.findIndex(u => u.userType === userType);
    
    if (userIndex !== -1 && mockDb.users[userIndex].userType === "nurse") {
      const nurse = mockDb.users[userIndex] as NurseUser;
      nurse.availabilityStatus = body.available;
      
      if (body.location) {
        nurse.location = body.location;
      }
      
      return {
        data: {
          available: body.available
        }
      };
    } else {
      return Promise.reject({
        response: {
          status: 404,
          data: { message: "Nurse not found" }
        }
      });
    }
  }

  if (url.includes("/nurse/requests") && method === "GET") {
    const token = config.headers.Authorization?.split(" ")[1];
    
    if (!token) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Unauthorized" }
        }
      });
    }
    
    // Filter requests that are pending or assigned to this nurse
    const pendingRequests = mockDb.serviceRequests.filter(
      req => req.status === "pending" && req.broadcastToAllNurses === true
    );
    
    return {
      data: pendingRequests
    };
  }
  
  // Admin endpoints
  if (url.includes("/admin/users") && method === "GET") {
    const token = config.headers.Authorization?.split(" ")[1];
    
    if (!token) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Unauthorized" }
        }
      });
    }
    
    const userType = localStorage.getItem("user_type");
    if (userType !== "admin") {
      return Promise.reject({
        response: {
          status: 403,
          data: { message: "Forbidden: Admin access required" }
        }
      });
    }
    
    // Return all users without passwords
    const usersWithoutPasswords = mockDb.users.map(u => ({ ...u, password: undefined }));
    
    return {
      data: usersWithoutPasswords
    };
  }
  
  if (url.match(/\/admin\/users\/[\w-]+\/activate/) && method === "PUT") {
    const token = config.headers.Authorization?.split(" ")[1];
    
    if (!token) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Unauthorized" }
        }
      });
    }
    
    const userType = localStorage.getItem("user_type");
    if (userType !== "admin") {
      return Promise.reject({
        response: {
          status: 403,
          data: { message: "Forbidden: Admin access required" }
        }
      });
    }
    
    // Extract user ID from URL
    const userId = url.split('/').pop().replace('/activate', '');
    const userIndex = mockDb.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return Promise.reject({
        response: {
          status: 404,
          data: { message: "User not found" }
        }
      });
    }
    
    // Activate the user
    mockDb.users[userIndex].isActive = true;
    mockDb.users[userIndex].activationDate = new Date().toISOString();
    
    return {
      data: { ...mockDb.users[userIndex], password: undefined }
    };
  }
  
  if (url.match(/\/admin\/users\/[\w-]+\/deactivate/) && method === "PUT") {
    const token = config.headers.Authorization?.split(" ")[1];
    
    if (!token) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Unauthorized" }
        }
      });
    }
    
    const userType = localStorage.getItem("user_type");
    if (userType !== "admin") {
      return Promise.reject({
        response: {
          status: 403,
          data: { message: "Forbidden: Admin access required" }
        }
      });
    }
    
    // Extract user ID from URL
    const userId = url.split('/').pop().replace('/deactivate', '');
    const userIndex = mockDb.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return Promise.reject({
        response: {
          status: 404,
          data: { message: "User not found" }
        }
      });
    }
    
    // Deactivate the user
    mockDb.users[userIndex].isActive = false;
    
    return {
      data: { ...mockDb.users[userIndex], password: undefined }
    };
  }
  
  if (url.match(/\/admin\/users\/[\w-]+/) && method === "DELETE") {
    const token = config.headers.Authorization?.split(" ")[1];
    
    if (!token) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: "Unauthorized" }
        }
      });
    }
    
    const userType = localStorage.getItem("user_type");
    if (userType !== "admin") {
      return Promise.reject({
        response: {
          status: 403,
          data: { message: "Forbidden: Admin access required" }
        }
      });
    }
    
    // Extract user ID from URL
    const userId = url.split('/').pop();
    const userIndex = mockDb.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return Promise.reject({
        response: {
          status: 404,
          data: { message: "User not found" }
        }
      });
    }
    
    // Delete the user
    mockDb.users.splice(userIndex, 1);
    
    return {
      data: { success: true }
    };
  }
  
  // Default fallback for unhandled endpoints
  return Promise.reject({
    response: {
      status: 501,
      data: { message: "Endpoint not implemented in mock backend" }
    }
  });
}

// Helper function to get a mock user for testing
export const getMockTestUser = () => {
  if (useMockResponses) {
    // Update to return the default admin account if needed
    return {
      email: "admin.auth",
      password: "Qwer112233"
    };
  }
  return null;
};

export default apiClient;
