import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useRecover } from "../context/RecoverPasswordContext.jsx";

const VITE_API_URL = import.meta.env.VITE_API_URL;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { setOtp } = useRecover();

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Veuillez saisir votre adresse e-mail");
      return;
    }

    setIsLoading(true);

    try {
      // Generate a random OTP
      const OTP = Math.floor(1000 + Math.random() * 9000);
      setOtp(OTP);

      // Store email temporarily
      sessionStorage.setItem("resetEmail", email);

      // Send email request to backend
      const response = await fetch(`${VITE_API_URL}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          subject: "Votre code de récupération",
          text: `Votre code de vérification est : ${OTP}`,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Un code de vérification a été envoyé à votre adresse e-mail");
        navigate("/verification-code");
      } else {
        throw new Error(result.message || "Échec de l'envoi du code");
      }
    } catch (error) {
      toast.error("Échec de l'envoi du code. Veuillez réessayer.");
      console.error("Error sending code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="relative">
          <button 
            onClick={() => navigate("/")} 
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
          <CardTitle className="text-2xl font-bold text-center">Mot de passe oublié</CardTitle>
          <CardDescription className="text-center">
            Entrez votre adresse e-mail pour recevoir un code de vérification
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSendCode}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Envoi en cours..." : "Envoyer le code"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/")}
            >
              Retour à la connexion
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ForgotPassword;