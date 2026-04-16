//apps/frontend/app/(auth)/signin/page.tsx
import { AuthPage } from "@/app/components/authpage";
export default function SignUp(){
    return(
        <AuthPage signIn={true}></AuthPage>
    )
}