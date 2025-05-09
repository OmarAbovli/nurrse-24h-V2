import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/assets/logo";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/services/authService";
import { AlertCircle, Info } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useTranslation } from "@/hooks/use-translation";

interface AuthFormProps {
  type: "login" | "register";
  userType: "patient" | "nurse" | "admin"; // Updated to include "admin"
}

const AuthForm = ({ type, userType }: AuthFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState(""); 
  const [phone, setPhone] = useState(""); 
  const [nationalId, setNationalId] = useState(""); // Added for national ID
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [testCredentials, setTestCredentials] = useState<{email: string, password: string} | null>(null);

  // Check for test credentials on component mount
  useEffect(() => {
    const mockUser = authService.getTestCredentials();
    if (mockUser) {
      setTestCredentials(mockUser);
    }
  }, []);

  // Fill form with test credentials
  const applyTestCredentials = () => {
    if (testCredentials) {
      setEmail(testCredentials.email);
      setPassword(testCredentials.password);
      if (type === "register") {
        setConfirmPassword(testCredentials.password);
        setFullName("Test User"); 
        setPhone("+201234567890"); 
        setNationalId("12345678901234");
        setAcceptTerms(true);
      }
    }
  };

  const validateEgyptianPhone = (phone: string) => {
    // Egyptian phone numbers: +20 followed by 10 digits, or 01 followed by 9 digits
    const egyptianPhoneRegex = /^(\+201|01)[0-9]{9}$/;
    return egyptianPhoneRegex.test(phone);
  };

  const validateNationalId = (id: string) => {
    // Egyptian National ID is 14 digits
    const nationalIdRegex = /^[0-9]{14}$/;
    return nationalIdRegex.test(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    // Form validation
    if (type === "register") {
      if (!acceptTerms) {
        setFormError(t("You must accept the terms and conditions to register."));
        toast({
          title: t("Terms & Conditions Required"),
          description: t("You must accept the terms and conditions to register."),
          variant: "destructive",
        });
        return;
      }
      
      if (password !== confirmPassword) {
        setFormError(t("Passwords do not match."));
        toast({
          title: t("Password Mismatch"),
          description: t("Passwords do not match. Please try again."),
          variant: "destructive",
        });
        return;
      }
      
      if (password.length < 6) {
        setFormError(t("Password must be at least 6 characters long."));
        toast({
          title: t("Password Too Short"),
          description: t("Password must be at least 6 characters long."),
          variant: "destructive",
        });
        return;
      }
      
      // Validate full name and phone for registration
      if (!fullName.trim()) {
        setFormError(t("Full name is required."));
        toast({
          title: t("Full Name Required"),
          description: t("Please enter your full name."),
          variant: "destructive",
        });
        return;
      }
      
      if (!phone.trim()) {
        setFormError(t("Phone number is required."));
        toast({
          title: t("Phone Number Required"),
          description: t("Please enter your phone number."),
          variant: "destructive",
        });
        return;
      }

      if (!validateEgyptianPhone(phone)) {
        setFormError(t("Please enter a valid Egyptian phone number."));
        toast({
          title: t("Invalid Phone Number"),
          description: t("Please enter a valid Egyptian phone number (starting with +201 or 01)."),
          variant: "destructive",
        });
        return;
      }
      
      // Validate National ID for patient registration
      if (userType === "patient" && !validateNationalId(nationalId)) {
        setFormError(t("Please enter a valid 14-digit National ID."));
        toast({
          title: t("Invalid National ID"),
          description: t("Please enter a valid 14-digit Egyptian National ID."),
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    
    try {
      console.log(`Attempting to ${type} as ${userType} with email: ${email}`);
      
      if (type === "login") {
        await authService.login({ email, password });
        console.log("Login successful");
        toast({
          title: t("Success"),
          description: t("Login successful!"),
        });
      } else {
        // Include name, phone and national ID in registration data
        await authService.register({ 
          email, 
          password, 
          userType,
          name: fullName,
          phone,
          nationalId: userType === "patient" ? nationalId : undefined,
          isActive: false // New accounts start as inactive
        });
        console.log("Registration successful");
        toast({
          title: t("Success"),
          description: t("Registration successful! Your account is pending activation by an administrator."),
        });
      }

      // Check if profile exists or create it
      try {
        const profile = await authService.getProfile();
        console.log("Retrieved profile:", profile);
        
        // Redirect based on user type, auth type and activation status
        if (type === "login") {
          if (!profile.isActive) {
            console.log("Account is not activated");
            toast({
              title: t("Account Pending Activation"),
              description: t("Your account is pending activation by an administrator."),
              variant: "destructive", // Changed from "warning" to "destructive"
            });
            authService.logout(); // Logout if account isn't activated
            return;
          }
          
          if (userType === "patient") {
            if (!profile.profileComplete) {
              navigate("/patient/complete-profile");
            } else {
              navigate("/patient/dashboard");
            }
          } else if (userType === "nurse") {
            if (!profile.profileComplete) {
              navigate("/nurse/register-info");
            } else {
              navigate("/nurse/dashboard");
            }
          } else if (userType === "admin") {
            navigate("/admin/dashboard");
          }
        } else {
          // For registration, inform the user to wait for activation
          authService.logout();
          navigate("/");
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        
        if (type === "register") {
          authService.logout();
          navigate("/");
        } else {
          // Default redirects if profile check fails
          if (!authService.isAuthenticated()) {
            navigate("/");
            return;
          }
          
          if (userType === "patient") {
            navigate("/patient/dashboard");
          } else if (userType === "nurse") {
            navigate("/nurse/dashboard");
          } else if (userType === "admin") {
            navigate("/admin/dashboard");
          }
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      const errorMessage = error.response?.data?.message || t("Please check your credentials and try again.");
      setFormError(errorMessage);
      toast({
        title: t("Authentication Failed"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get the proper display name for the user type
  const getUserTypeDisplay = () => {
    if (userType === "nurse") {
      return t("Medical Cadres");
    }
    return t(userType.charAt(0).toUpperCase() + userType.slice(1));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-accent/50">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo size={60} />
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {type === "login" ? t("Welcome Back") : t("Create Account")}
            </CardTitle>
            <CardDescription className="text-center">
              {type === "login"
                ? t(`Sign in to your ${getUserTypeDisplay()} account`)
                : t(`Register as a new ${getUserTypeDisplay()}`)}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {formError && (
                <div className="p-3 text-sm text-white bg-red-500 rounded-md">
                  {formError}
                </div>
              )}
              
              {testCredentials && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t("Mock Backend Detected")}</AlertTitle>
                  <AlertDescription className="flex flex-col space-y-2">
                    <span>{t("Using mock backend for testing. You can use these test credentials:")}</span>
                    <code className="bg-muted p-1 rounded text-xs">
                      {t("Email")}: {testCredentials.email}<br />
                      {t("Password")}: {testCredentials.password}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={applyTestCredentials}
                      type="button"
                    >
                      {t("Apply Test Credentials")}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Additional fields for registration */}
              {type === "register" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t("Full Name")}</Label>
                    <Input
                      id="fullName"
                      placeholder={t("Enter your full name")}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("Phone Number")}</Label>
                    <Input
                      id="phone"
                      placeholder={t("Enter your Egyptian phone number (e.g., 01xxxxxxxxx)")}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  
                  {/* National ID field for patients */}
                  {userType === "patient" && (
                    <div className="space-y-2">
                      <Label htmlFor="nationalId">{t("National ID")}</Label>
                      <Input
                        id="nationalId"
                        placeholder={t("Enter your 14-digit National ID")}
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">{t("Email")}</Label>
                <Input
                  id="email"
                  placeholder={t("Enter your email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("Password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("Enter your password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {type === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("Confirm Password")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t("Confirm your password")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              
              {type === "register" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(!!checked)}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("I accept the")}{" "}
                    <Link to="/terms" className="text-primary underline">
                      {t("Terms & Conditions")}
                    </Link>
                  </label>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-t-transparent rounded-full animate-spin" />
                    {type === "login" ? t("Signing In...") : t("Registering...")}
                  </>
                ) : (
                  type === "login" ? t("Sign In") : t("Register")
                )}
              </Button>

              <p className="text-sm text-center">
                {type === "login"
                  ? t("Don't have an account? ")
                  : t("Already have an account? ")}
                <Link
                  to={
                    userType === "patient"
                      ? type === "login"
                        ? "/patient/register"
                        : "/patient/login"
                      : type === "login"
                        ? "/nurse/register"
                        : "/nurse/login"
                  }
                  className="text-primary font-medium"
                >
                  {type === "login" ? t("Register") : t("Sign In")}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        <p className="text-xs text-center text-muted-foreground">
          <Link to="/terms" className="hover:underline">
            {t("Terms & Conditions")}
          </Link>{" "}
          • © 2025 24h App
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
