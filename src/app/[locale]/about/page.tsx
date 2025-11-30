import { Link } from "~/navigation"; // FIX: Localized Link
import { Button } from "~/components/ui/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/ui/card";
import { env } from "~/env";
import { ArrowLeft, GitCommit, Calendar, Package, FileCode, Tag } from "lucide-react";
import packageJson from "../../../../package.json"; // FIX: Adjusted path depth
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";

export const dynamic = "force-static";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: `${t('title')} - My Karaoke Party`,
  };
}

export default function AboutPage() {
  const t = useTranslations('about');
  
  // Determine versions from package.json
  const nextVersion = packageJson.dependencies.next;
  const prismaVersion = packageJson.dependencies["@prisma/client"];
  
  // Build Info
  const buildDate = env.NEXT_PUBLIC_BUILD_DATE 
    ? new Date(env.NEXT_PUBLIC_BUILD_DATE).toLocaleString() 
    : "Unknown";
    
  const commitHash = env.NEXT_PUBLIC_GIT_COMMIT_SHA 
    ? env.NEXT_PUBLIC_GIT_COMMIT_SHA.substring(0, 7) 
    : "Unknown";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient text-foreground">
      <Card className="w-full max-w-lg shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">My Karaoke Party</CardTitle>
          <CardDescription>{t('buildInfo')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="grid gap-4 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-primary" />
                <span className="font-medium">{t('appVersion')}</span>
              </div>
              <span className="font-mono font-bold">{env.NEXT_PUBLIC_MKP_APP_VER}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{t('buildDate')}</span>
              </div>
              <span className="text-muted-foreground text-right">{buildDate}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <GitCommit className="h-5 w-5 text-orange-500" />
                <span className="font-medium">{t('gitCommit')}</span>
              </div>
              <span className="font-mono text-muted-foreground">{commitHash}</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
              {t('coreDependencies')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col p-3 rounded-lg border bg-background">
                    <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                        <FileCode className="h-4 w-4" />
                        <span className="text-xs font-medium">Next.js</span>
                    </div>
                    <span className="font-mono font-bold">{nextVersion}</span>
                </div>
                <div className="flex flex-col p-3 rounded-lg border bg-background">
                    <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span className="text-xs font-medium">Prisma</span>
                    </div>
                    <span className="font-mono font-bold">{prismaVersion}</span>
                </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Button asChild variant="secondary" className="w-full">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back')}
              </Link>
            </Button>
          </div>

        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-white/40 text-xs">
        <p>{t('nodeEnv')}: {process.env.NODE_ENV}</p>
      </div>
    </main>
  );
}
