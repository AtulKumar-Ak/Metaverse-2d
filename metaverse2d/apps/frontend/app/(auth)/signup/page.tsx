//apps/frontend/app/(auth)/signup/page.tsx
import { AuthPage } from "@/app/components/authpage";
export default function SignUp(){
    return(
        <AuthPage signIn={false}></AuthPage>
    )
}