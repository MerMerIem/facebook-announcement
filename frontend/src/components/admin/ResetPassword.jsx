import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/Card'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { X, Eye, EyeOff, Check } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'

const VITE_API_URL = import.meta.env.VITE_API_URL

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  // Password validation
  const validatePassword = (password) => {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasDigit = /\d/.test(password)

    return (
      password.length >= minLength && hasUpperCase && hasLowerCase && hasDigit
    )
  }

  const handleResetPassword = async (e) => {
    // console.log('callled')
    e.preventDefault()

    // console.log("vvv",!validatePassword(password))

    if (!validatePassword(password)) {
      toast.error(
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre',
      )
      return
    }
    // console.log("vvv2",(password !== confirmPassword))

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    const email = sessionStorage.getItem('resetEmail')
    if (!email) {
      toast.error(
        'Aucune adresse e-mail trouvée. Veuillez recommencer la procédure.',
      )
      navigate('/forgot-password')
      return
    }

    // console.log('Setting isLoading to true')
    setIsLoading(true)
    // console.log('Before try block')

    try {
      // console.log('called this why')
      const response = await fetch(`${VITE_API_URL}/api/auth/updatePassword`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, newPassword: password }),
      })

      // console.log("After fetch", response);

      const data = await response.json()
      // console.log('data', data)

      if (!response.ok) {
        throw new Error(
          data.message || 'Erreur lors de la réinitialisation du mot de passe',
        )
      }

      setSuccess(true)
      toast.success('Votre mot de passe a été réinitialisé avec succès')

      sessionStorage.removeItem('resetEmail')

      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (error) {
      console.log(error)
      toast.error(
        error.message ||
          'Échec de la réinitialisation du mot de passe. Veuillez réessayer.',
      )
      console.error('Error resetting password:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="relative">
          <button
            onClick={() => navigate('/verification-code')}
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
          <CardTitle className="text-2xl font-bold text-center">
            Réinitialiser le mot de passe
          </CardTitle>
          <CardDescription className="text-center">
            Créez un nouveau mot de passe pour votre compte
          </CardDescription>
        </CardHeader>

        {success ? (
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-800">
                Réinitialisation réussie
              </AlertTitle>
              <AlertDescription className="text-green-700">
                Votre mot de passe a été modifié avec succès. Vous allez être
                redirigé vers la page de connexion.
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : (
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Le mot de passe doit contenir au moins 8 caractères, une
                  majuscule, une minuscule et un chiffre.
                </p>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium"
                >
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? 'Réinitialisation...'
                  : 'Réinitialiser le mot de passe'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/verification-code')}
              >
                Retour
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}

export default ResetPassword
