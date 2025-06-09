"use client"

import { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { ExternalLink, BookOpen, GraduationCap, Home, Plus } from "lucide-react"
import Link from "next/link"

interface Class {
    id: string
    name: string
    description: string
    studentCount: number
    assignmentCount: number
    githubClassroomUrl: string
}

interface Student {
    id: string
    name: string
    email: string
    classId: string
    assignmentsCompleted: number
    totalAssignments: number
}

interface Assignment {
    id: string
    title: string
    description: string
    dueDate: string
    classId: string
    submissionCount: number
    totalStudents: number
}

export default function EducatorClassesPage() {
    const [classes, setClasses] = useState<Class[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Simulate fetching data
        const mockClasses: Class[] = [
            {
                id: "1",
                name: "Web Development 101",
                description: "Introduction to HTML, CSS, and JavaScript",
                studentCount: 25,
                assignmentCount: 8,
                githubClassroomUrl: "https://classroom.github.com/classrooms/web-dev-101",
            },
            {
                id: "2",
                name: "Frontend Development",
                description: "React, Vue, and modern frontend frameworks",
                studentCount: 18,
                assignmentCount: 12,
                githubClassroomUrl: "https://classroom.github.com/classrooms/frontend-dev",
            },
        ]

        const mockStudents: Student[] = [
            {
                id: "1",
                name: "Alice Johnson",
                email: "alice@student.edu",
                classId: "1",
                assignmentsCompleted: 6,
                totalAssignments: 8,
            },
            {
                id: "2",
                name: "Bob Smith",
                email: "bob@student.edu",
                classId: "1",
                assignmentsCompleted: 7,
                totalAssignments: 8,
            },
            {
                id: "3",
                name: "Carol Davis",
                email: "carol@student.edu",
                classId: "2",
                assignmentsCompleted: 10,
                totalAssignments: 12,
            },
        ]

        const mockAssignments: Assignment[] = [
            {
                id: "1",
                title: "JavaScript Fundamentals",
                description: "Basic JavaScript exercises",
                dueDate: "2024-01-15",
                classId: "1",
                submissionCount: 20,
                totalStudents: 25,
            },
            {
                id: "2",
                title: "React Components",
                description: "Build React components",
                dueDate: "2024-01-20",
                classId: "2",
                submissionCount: 15,
                totalStudents: 18,
            },
        ]

        setTimeout(() => {
            setClasses(mockClasses)
            setStudents(mockStudents)
            setAssignments(mockAssignments)
            setIsLoading(false)
        }, 1000)
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-96 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
                        <p className="text-gray-600 mt-2">Manage your classes, students, and assignments</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/educatorhome">
                            <Button variant="outline" className="flex items-center gap-2">
                                <Home className="w-4 h-4" />
                                Dashboard
                            </Button>
                        </Link>
                        <Button
                            onClick={() => window.open("https://classroom.github.com", "_blank")}
                            className="flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            GitHub Classroom
                        </Button>
                    </div>
                </div>

                <Tabs {...({ defaultValue: "classes", className: "space-y-6" } as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="classes">Classes</TabsTrigger>
                        <TabsTrigger value="students">Students</TabsTrigger>
                        <TabsTrigger value="assignments">Assignments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="classes" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Your Classes</h2>
                            <Button className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Create Class
                            </Button>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                            {classes.map((classItem) => (
                                <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BookOpen className="w-5 h-5" />
                                            {classItem.name}
                                        </CardTitle>
                                        <CardDescription>{classItem.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex gap-4">
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-blue-600">{classItem.studentCount}</div>
                                                    <div className="text-sm text-gray-500">Students</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-green-600">{classItem.assignmentCount}</div>
                                                    <div className="text-sm text-gray-500">Assignments</div>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(classItem.githubClassroomUrl, "_blank")}
                                            className="w-full flex items-center gap-2"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Open in GitHub Classroom
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="students" className="space-y-6">
                        <h2 className="text-xl font-semibold">Student Progress</h2>
                        <div className="grid gap-4">
                            {students.map((student) => {
                                const classItem = classes.find((c) => c.id === student.classId)
                                const progressPercentage = (student.assignmentsCompleted / student.totalAssignments) * 100

                                return (
                                    <Card key={student.id}>
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <GraduationCap className="w-8 h-8 text-blue-600" />
                                                    <div>
                                                        <h3 className="font-semibold">{student.name}</h3>
                                                        <p className="text-sm text-gray-500">{student.email}</p>
                                                        <p className="text-sm text-gray-500">{classItem?.name}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-semibold">
                                                        {student.assignmentsCompleted}/{student.totalAssignments}
                                                    </div>
                                                    <div className="text-sm text-gray-500">Assignments</div>
                                                    <Badge
                                                        className={
                                                            progressPercentage >= 80
                                                                ? "bg-green-100 text-green-800"
                                                                : progressPercentage >= 60
                                                                    ? "bg-yellow-100 text-yellow-800"
                                                                    : "bg-red-100 text-red-800"
                                                        }
                                                    >
                                                        {Math.round(progressPercentage)}%
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </TabsContent>

                    <TabsContent value="assignments" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Assignments</h2>
                            <Button className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Create Assignment
                            </Button>
                        </div>
                        <div className="grid gap-4">
                            {assignments.map((assignment) => {
                                const classItem = classes.find((c) => c.id === assignment.classId)
                                const submissionPercentage = (assignment.submissionCount / assignment.totalStudents) * 100

                                return (
                                    <Card key={assignment.id}>
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg">{assignment.title}</h3>
                                                    <p className="text-gray-600 mt-1">{assignment.description}</p>
                                                    <p className="text-sm text-gray-500 mt-2">
                                                        Class: {classItem?.name} • Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <div className="text-lg font-semibold">
                                                        {assignment.submissionCount}/{assignment.totalStudents}
                                                    </div>
                                                    <div className="text-sm text-gray-500">Submissions</div>
                                                    <Badge
                                                        className={
                                                            submissionPercentage >= 80
                                                                ? "bg-green-100 text-green-800"
                                                                : submissionPercentage >= 60
                                                                    ? "bg-yellow-100 text-yellow-800"
                                                                    : "bg-red-100 text-red-800"
                                                        }
                                                    >
                                                        {Math.round(submissionPercentage)}%
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
