import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Shield,
  TrendingUp,
  MessageCircle,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: "Easy Complaint Filing",
      description: "Submit complaints quickly with our intuitive form. Track status in real-time.",
    },
    {
      icon: Shield,
      title: "Anonymous Option",
      description: "File complaints anonymously for sensitive matters. Your privacy is protected.",
    },
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description: "Rich dashboards with insights and visualizations for data-driven decisions.",
    },
    {
      icon: MessageCircle,
      title: "24/7 Chatbot Support",
      description: "Get instant answers to common questions through our intelligent assistant.",
    },
    {
      icon: CheckCircle,
      title: "Multi-Level Resolution",
      description: "Structured workflow with Master Admin, Sub-Admin, and User roles.",
    },
    {
      icon: Clock,
      title: "Fast Resolution",
      description: "Average resolution time of 2.8 days. Track every step of the process.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16 space-y-6">
          <div className="inline-block">
            <div className="h-16 w-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4 shadow-lg">
              <FileText className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Complaint Management System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform for managing complaints across your educational institute.
            Streamline resolution, track progress, and enhance satisfaction.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-lg">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/track")}
              className="shadow-lg"
            >
              Track Complaint
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-card rounded-2xl p-8 shadow-xl mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            Trusted by Our Community
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">245+</div>
              <div className="text-muted-foreground">Total Complaints</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-success mb-2">113</div>
              <div className="text-muted-foreground">Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">2.8</div>
              <div className="text-muted-foreground">Avg. Days</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-warning mb-2">4.2/5</div>
              <div className="text-muted-foreground">Satisfaction</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-12 text-center text-primary-foreground shadow-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-6 opacity-90">
            Join hundreds of students and staff using our platform to resolve issues efficiently.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/auth")}
              className="shadow-lg"
            >
              Sign Up Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/track")}
              className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary shadow-lg"
            >
              Track Complaint
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
