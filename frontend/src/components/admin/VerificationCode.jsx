import { useState, useEffect } from "react";
import { useRecover } from "../context/RecoverPasswordContext"; // Import context
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const VITE_API_URL = import.meta.env.VITE_API_URL;

const VerificationCode = () => {
  const [code, setCode] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();

  const { otp, setOtp } = useRecover(); // Get and set OTP from context

  useEffect(() => {
    const resetEmail = sessionStorage.getItem("resetEmail");
    if (!resetEmail) {
      toast.error("Veuillez d'abord saisir votre adresse e-mail");
      navigate("/forgot-password");
      return;
    }

    if (timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timerId);
    } else {
      setCanResend(true);
    }
  }, [timeLeft, navigate]);

  const handleInputChange = (index, value) => {
    if (value.length > 1) value = value[0];
    if (!/^[0-9]*$/.test(value) && value !== "") return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value !== "" && index < 3) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && index > 0 && code[index] === "") {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const resendCode = async () => {
    if (!canResend) return;

    const email = sessionStorage.getItem("resetEmail");
    if (!email) {
      toast.error("Adresse e-mail non trouvée");
      navigate("/forgot-password");
      return;
    }

    setIsLoading(true);

    try {
      // Generate a new OTP
      const newOTP = Math.floor(1000 + Math.random() * 9000);
      setOtp(newOTP); // Store in context

      // Send the new OTP to the backend
      const response = await fetch(`${VITE_API_URL}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          subject: "Votre nouveau code de vérification",
          text: `Votre nouveau code de vérification est : ${newOTP}`,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Un nouveau code de vérification a été envoyé");
        setTimeLeft(60);
        setCanResend(false);
      } else {
        throw new Error(result.message || "Échec de l'envoi du code");
      }
    } catch (error) {
      toast.error("Échec de l'envoi du code. Veuillez réessayer.");
      console.error("Error resending code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 4) {
      toast.error("Veuillez saisir les 4 chiffres du code");
      return;
    }

    setIsLoading(true);

    try {
      if (fullCode !== otp.toString()) {
        throw new Error("Code incorrect");
      }

      toast.success("Code vérifié avec succès");
      navigate("/reset-password");
    } catch (error) {
      toast.error(error.message || "Code incorrect. Veuillez réessayer.");
      console.error("Error verifying code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="relative">
          <button 
            onClick={() => navigate("/forgot-password")} 
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
          <CardTitle className="text-2xl font-bold text-center">Vérification du code</CardTitle>
          <CardDescription className="text-center">
            Entrez le code à 4 chiffres envoyé à votre adresse e-mail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map(index => (
              <Input
                key={index}
                id={`code-${index}`}
                type="text"
                maxLength={1}
                value={code[index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-16 h-16 text-2xl text-center"
                autoComplete="off"
              />
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {canResend 
                ? "Vous n'avez pas reçu de code ?" 
                : `Renvoyer le code dans ${timeLeft} secondes`}
            </p>
            <Button
              type="button"
              variant="link"
              onClick={resendCode}
              disabled={!canResend || isLoading}
              className="mt-1 p-0 h-auto"
            >
              Renvoyer le code
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            onClick={verifyCode} 
            className="w-full" 
            disabled={isLoading || code.some(digit => digit === "")}
          >
            {isLoading ? "Vérification..." : "Vérifier"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="w-full"
            onClick={() => navigate("/forgot-password")}
          >
            Retour
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerificationCode;