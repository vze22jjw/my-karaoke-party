import { Link } from "~/navigation";
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
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";

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
  
  const nextVersion = env.NEXT_PUBLIC_NEXT_VERSION;
  const prismaVersion = env.NEXT_PUBLIC_PRISMA_VERSION;
  
  let formattedDate = "Unknown";
  try {
    if (env.NEXT_PUBLIC_BUILD_DATE) {
      const date = new Date(env.NEXT_PUBLIC_BUILD_DATE);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toLocaleString();
      }
    }
  } catch (e) {
    console.error("Failed to parse build date", e);
  }
    
  const commitHash = env.NEXT_PUBLIC_GIT_COMMIT_SHA 
    ? env.NEXT_PUBLIC_GIT_COMMIT_SHA.substring(0, 7) 
    : "Unknown";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient text-foreground">
      <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-sm border-none">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-extrabold tracking-tight">{t('title')}</CardTitle>
          <CardDescription className="text-muted-foreground">{t('buildInfo')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-white/5">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-primary" />
                <span className="font-medium text-sm">{t('appVersion')}</span>
              </div>
              <span className="font-mono font-bold text-sm">{env.NEXT_PUBLIC_MKP_APP_VER}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-white/5">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-sm">{t('buildDate')}</span>
              </div>
              <span className="text-muted-foreground text-xs text-right max-w-[140px] leading-tight">{formattedDate}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-white/5">
              <div className="flex items-center gap-3">
                <GitCommit className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-sm">{t('gitCommit')}</span>
              </div>
              <span className="font-mono text-muted-foreground text-sm">{commitHash}</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-widest ml-1">
              {t('coreDependencies')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col p-3 rounded-lg bg-muted/30 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5 text-muted-foreground">
                        <FileCode className="h-4 w-4" />
                        <span className="text-xs font-medium">Next.js</span>
                    </div>
                    <span className="font-mono font-bold text-lg">{nextVersion}</span>
                </div>
                <div className="flex flex-col p-3 rounded-lg bg-muted/30 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span className="text-xs font-medium">Prisma</span>
                    </div>
                    <span className="font-mono font-bold text-lg">{prismaVersion}</span>
                </div>
            </div>
          </div>

          <div className="pt-2">
            <Button asChild variant="secondary" className="w-full h-12 text-base font-medium">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back')}
              </Link>
            </Button>
          </div>

        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-white/30 text-xs font-mono uppercase tracking-wider">
        {t('nodeEnv')}: {process.env.NODE_ENV}
      </div>
    </main>
  );
}
